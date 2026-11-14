import { env } from "../config/env.js";
import { consumePaidApiCall, PaidApiLimitError } from "../middleware/rate-limit.js";

const statusTitles: Record<string, string> = {
  new: "Inquiry received",
  in_review: "Inquiry under review",
  contacted: "Our team has contacted you",
  resolved: "Inquiry resolved",
  closed: "Inquiry closed",
};

export class SmsProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly responseCode?: number,
    readonly networkCode?: string,
  ) {
    super(message);
    this.name = "SmsProviderError";
  }
}

export const isSmsConfigured = () => !!env.TEXTBEE_API_KEY;

export async function sendInquiryStatusSms(inquiry: { phone: string; reference: string; status: string }) {
  if (!isSmsConfigured())
    throw new Error("TextBee SMS is not configured");
  const title = statusTitles[inquiry.status];
  if (!title) throw new Error("Unsupported inquiry status");
  if (!await consumePaidApiCall()) throw new PaidApiLimitError();
  const trackingUrl = `${(env.PUBLIC_WEB_URL || env.WEB_ORIGIN).replace(/\/+$/, "")}/track-inquiry`;
  const message = [
    "COSMOPOLITAN FUNERAL HOMES",
    `Inquiry update: ${title}`,
    `Reference: ${inquiry.reference}`,
    `Track: ${trackingUrl}`,
    "To opt out, contact us.",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    let response: Response;
    try {
      response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
        method: "POST",
        headers: {
          "x-api-key": env.TEXTBEE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          recipients: [inquiry.phone],
          ...(env.TEXTBEE_DEVICE_ID ? { deviceId: env.TEXTBEE_DEVICE_ID } : {}),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted)
        throw new SmsProviderError("TextBee request timed out", "TEXTBEE_TIMEOUT");
      const cause = error && typeof error === "object" && "cause" in error
        ? (error as { cause?: { code?: unknown } }).cause
        : undefined;
      const networkCode = typeof cause?.code === "string" && /^[A-Z0-9_]+$/.test(cause.code)
        ? cause.code
        : undefined;
      throw new SmsProviderError("Could not connect to TextBee", "TEXTBEE_NETWORK_ERROR", undefined, networkCode);
    }
    if (!response.ok) {
      if (response.status === 404 && env.TEXTBEE_DEVICE_ID) {
        throw new SmsProviderError("The configured TextBee device was not found", "TEXTBEE_DEVICE_NOT_FOUND", response.status);
      }
      throw new SmsProviderError("TextBee rejected the SMS request", "TEXTBEE_HTTP_ERROR", response.status);
    }
    let result: { data?: { success?: boolean; successCount?: number; failureCount?: number } };
    try {
      result = await response.json() as typeof result;
    } catch {
      throw new SmsProviderError("TextBee returned an invalid response", "TEXTBEE_INVALID_RESPONSE");
    }
    const outcome = result.data;
    if (outcome?.success === true) return;
    if (typeof outcome?.successCount === "number" && typeof outcome.failureCount === "number" &&
      outcome.successCount > 0 && outcome.failureCount === 0) return;
    if (typeof outcome?.failureCount === "number" && outcome.failureCount > 0)
      throw new SmsProviderError("TextBee could not dispatch the SMS to the device", "TEXTBEE_SEND_FAILED");
    if (!outcome)
      throw new SmsProviderError("TextBee did not accept the SMS request", "TEXTBEE_INVALID_RESPONSE");
    throw new SmsProviderError("TextBee did not accept the SMS request", "TEXTBEE_SEND_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
