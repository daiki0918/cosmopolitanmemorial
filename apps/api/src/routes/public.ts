import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Branch, Inquiry } from "../models/index.js";
import { env } from "../config/env.js";
import { normalizePhone } from "../lib/phone.js";

const r = Router();
const pub = { status: "active", verified: true };
const sel = "code slug name address municipality province phone hours image location pinAccuracy";

r.get("/branches", async (req, res) => {
  const q = z.object({ search: z.string().max(80).optional() }).parse(req.query);
  const f: any = { ...pub };
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    f.$or = [{ name: rx }, { municipality: rx }, { province: rx }, { address: rx }];
  }
  res.json(await Branch.find(f).select(sel).sort("name").limit(100));
});
r.get("/branches/:slug", async (req, res) => {
  const b = await Branch.findOne({ ...pub, slug: String(req.params.slug) }).select(sel);
  b ? res.json(b) : res.status(404).json({ error: "Not found" });
});

const body = z.object({
  name: z.string().min(2).max(120), email: z.string().email().optional(),
  phone: z.string().max(30).optional().transform(normalizePhone),
  smsConsent: z.boolean().default(false),
  subject: z.string().min(3).max(150), message: z.string().min(10).max(3000),
  category: z.enum(["services", "packages", "payments", "branches", "general"]).default("general"),
  branch: z.string().regex(/^[a-f\d]{24}$/i),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(0).optional(), // honeypot
}).refine((d) => d.email || d.phone, { message: "Email or phone required" })
  .superRefine((d, ctx) => {
    if (d.smsConsent && (!d.phone || !/^\+[1-9]\d{7,14}$/.test(d.phone))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Enter a phone number in E.164 format to receive SMS updates" });
    }
  });

r.post("/inquiries", rateLimit({ windowMs: 3600_000, limit: 5 }), async (req, res) => {
  if (!env.TURNSTILE_SECRET_KEY) return void res.status(503).json({ error: "The inquiry form is temporarily unavailable. Please contact us by phone." });
  const { website, turnstileToken, ...d } = body.parse(req.body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let verified: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Turnstile verification returned HTTP ${response.status}`);
    verified = await response.json() as typeof verified;
  } catch (error) {
    console.error("Turnstile verification is unavailable.", error);
    return void res.status(503).json({ error: "The security check is temporarily unavailable. Please try again." });
  } finally {
    clearTimeout(timeout);
  }
  const actionValid = verified.action === "inquiry" || (env.NODE_ENV !== "production" && verified.action === "test");
  if (!verified.success || !actionValid || verified.hostname !== new URL(env.WEB_ORIGIN).hostname)
    return void res.status(400).json({ error: "Security check failed or expired. Please complete it again." });
  const branch = await Branch.findOne({ _id: d.branch, ...pub }).select("_id");
  if (!branch) return void res.status(400).json({ error: "Select an active branch to route your inquiry" });
  const i = await Inquiry.create({
    ...d,
    ...(d.smsConsent ? { smsConsentAt: new Date() } : {}),
    timeline: [{ action: "created" }],
  });
  res.status(201).json({ reference: i.reference });
});
r.get("/requests/:reference", rateLimit({ windowMs: 60_000, limit: 20 }), async (req, res) => {
  const i = await Inquiry.findOne({ reference: String(req.params.reference) }).select("reference status createdAt");
  i ? res.json(i) : res.status(404).json({ error: "Not found" });
});
export default r;
