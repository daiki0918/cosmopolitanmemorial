import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Branch, Inquiry } from "../models/index.js";

const r = Router();
const pub = { status: "active", verified: true };
const sel = "code slug name address municipality province phone hours image location";

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
  name: z.string().min(2).max(120), email: z.string().email().optional(), phone: z.string().max(30).optional(),
  subject: z.string().min(3).max(150), message: z.string().min(10).max(3000),
  category: z.enum(["services", "packages", "payments", "branches", "general"]).default("general"),
  branch: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  website: z.string().max(0).optional(), // honeypot
}).refine((d) => d.email || d.phone, { message: "Email or phone required" });

r.post("/inquiries", rateLimit({ windowMs: 3600_000, limit: 5 }), async (req, res) => {
  const { website, ...d } = body.parse(req.body);
  const i = await Inquiry.create({ ...d, timeline: [{ action: "created" }] });
  res.status(201).json({ reference: i.reference });
});
r.get("/requests/:reference", rateLimit({ windowMs: 60_000, limit: 20 }), async (req, res) => {
  const i = await Inquiry.findOne({ reference: String(req.params.reference) }).select("reference status createdAt");
  i ? res.json(i) : res.status(404).json({ error: "Not found" });
});
export default r;
