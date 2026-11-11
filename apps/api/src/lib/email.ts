import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]!));

const statusDetails: Record<string, { title: string; message: string; color: string }> = {
  new: { title: "Inquiry received", message: "Our team has received your inquiry and will review it shortly.", color: "#2563eb" },
  in_review: { title: "Inquiry under review", message: "Our team is reviewing your inquiry and will follow up as soon as possible.", color: "#d97706" },
  contacted: { title: "Our team has contacted you", message: "Our team has reached out using the contact information you provided.", color: "#7c3aed" },
  resolved: { title: "Inquiry resolved", message: "Your inquiry has been marked as resolved. If you need more help, please contact us again.", color: "#059669" },
  closed: { title: "Inquiry closed", message: "This inquiry has been closed. If you still need assistance, please send us a new inquiry.", color: "#64748b" },
};

const transport = env.GMAIL_USER && env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD.replace(/\s/g, "") },
  })
  : null;

export async function sendInquiryStatusEmail(inquiry: {
  email: string;
  name: string;
  reference: string;
  subject: string;
  status: string;
  branchName?: string;
}) {
  if (!transport || !env.GMAIL_USER) throw new Error("Gmail SMTP is not configured");
  const detail = statusDetails[inquiry.status];
  if (!detail) throw new Error("Unsupported inquiry status");
  const name = escapeHtml(inquiry.name);
  const reference = escapeHtml(inquiry.reference);
  const subject = escapeHtml(inquiry.subject);
  const branch = inquiry.branchName ? escapeHtml(inquiry.branchName) : "";

  await transport.sendMail({
    from: { name: "Cosmopolitan Funeral Homes", address: env.GMAIL_USER },
    to: inquiry.email,
    subject: `${detail.title} · ${inquiry.reference}`,
    text: [
      `Hello ${inquiry.name},`,
      "",
      detail.message,
      "",
      `Inquiry: ${inquiry.subject}`,
      `Reference: ${inquiry.reference}`,
      ...(inquiry.branchName ? [`Branch: ${inquiry.branchName}`] : []),
      "",
      "Cosmopolitan Funeral Homes",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en"><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
        <tr><td style="background:#101d78;padding:28px 32px;color:#ffffff">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c7d2fe">Cosmopolitan Funeral Homes</div>
          <div style="margin-top:12px;font-size:25px;font-weight:700">${detail.title}</div>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 14px;font-size:16px">Hello ${name},</p>
          <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7">${detail.message}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px">
            <tr><td style="padding:18px 20px">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Current status</div>
              <div style="display:inline-block;margin-top:8px;padding:7px 12px;border-radius:20px;background:${detail.color};color:#ffffff;font-size:13px;font-weight:700">${detail.title}</div>
              <div style="margin-top:18px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Inquiry reference</div>
              <div style="margin-top:6px;color:#101d78;font-family:monospace;font-size:15px;font-weight:700">${reference}</div>
              <div style="margin-top:16px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Subject</div>
              <div style="margin-top:6px;font-size:14px">${subject}</div>
              ${branch ? `<div style="margin-top:16px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Branch</div><div style="margin-top:6px;font-size:14px">${branch}</div>` : ""}
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6">Please keep your inquiry reference private. If you need further assistance, reply to this email or contact your selected branch.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;padding:20px 32px;color:#64748b;font-size:12px">With care,<br><strong style="display:inline-block;margin-top:5px;color:#101d78">Cosmopolitan Funeral Homes</strong></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });
}
