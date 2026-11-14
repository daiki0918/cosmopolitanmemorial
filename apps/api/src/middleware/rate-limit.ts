import { createHmac } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { env } from "../config/env.js";
import { GUARDRAILS } from "../config/guardrails.js";
import { RateLimitBucket } from "../models/index.js";

function bucketKey(scope: string, subject: string, windowStart: number) {
  return createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${scope}\0${subject}\0${windowStart}`).digest("hex");
}

async function consumeBucket(key: string, limit: number, expiresAt: number) {
  const filter = { key, count: { $lt: limit } };
  let bucket;
  try {
    bucket = await RateLimitBucket.findOneAndUpdate(
      filter,
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(expiresAt) } },
      { new: true, upsert: true },
    ).lean();
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== 11000) throw error;
    bucket = await RateLimitBucket.findOneAndUpdate(filter, { $inc: { count: 1 } }, { new: true }).lean();
  }
  if (bucket) return { allowed: true, count: bucket.count };
  const current = await RateLimitBucket.findOne({ key }).select("count").lean();
  return { allowed: false, count: current?.count ?? limit };
}

function ipBucket(req: Request, scope: string, windowMs: number, limit: number) {
  const ip = req.ip ?? req.socket.remoteAddress;
  if (!ip) throw new Error("Cannot determine request IP for rate limiting");
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  return consumeBucket(bucketKey(scope, ip, windowStart), limit, windowStart + windowMs)
    .then((result) => ({ ...result, retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)) }));
}

function sendRateLimit(res: Parameters<RequestHandler>[1], limit: number, count: number, retryAfter: number, error: string) {
  res.set({
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, limit - count)),
    "RateLimit-Reset": String(retryAfter),
    "Retry-After": String(retryAfter),
  }).status(429).json({ error });
}

export const apiRateLimit: RequestHandler = async (req, res, next) => {
  const limit = GUARDRAILS.api.requestsPerIpHour;
  const result = await ipBucket(req, "api", GUARDRAILS.api.requestWindowMs, limit);
  res.set({
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, limit - result.count)),
    "RateLimit-Reset": String(result.retryAfter),
  });
  if (!result.allowed) return sendRateLimit(res, limit, result.count, result.retryAfter, "Too many requests. Please try again later or call 0917 803 8524 or 0949 993 9220.");
  next();
};

export const inquiryRateLimit: RequestHandler = async (req, res, next) => {
  const limit = GUARDRAILS.api.inquiriesPerIpDay;
  const result = await ipBucket(req, "inquiry", GUARDRAILS.api.inquiryWindowMs, limit);
  res.set({
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, limit - result.count)),
    "RateLimit-Reset": String(result.retryAfter),
  });
  if (!result.allowed) return sendRateLimit(res, limit, result.count, result.retryAfter, "Daily inquiry limit reached. Please try again tomorrow or call 0917 803 8524 or 0949 993 9220.");
  next();
};

export async function consumePaidApiCall() {
  const windowMs = GUARDRAILS.api.paidApiWindowMs;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = bucketKey("paid-api", "global", windowStart);
  return (await consumeBucket(key, GUARDRAILS.api.paidApiCallsPerDay, windowStart + windowMs)).allowed;
}

export class PaidApiLimitError extends Error {
  constructor() {
    super("Daily paid API limit reached");
    this.name = "PaidApiLimitError";
  }
}
