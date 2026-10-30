import { Router } from "express";
import { z } from "zod";
import { Branch, Inquiry, AuditLog, audit_ } from "../models/index.js";
import { requireAuth, can, branchScope } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth);
const page = (q: any) => ({ p: Math.max(1, +q.page || 1), n: Math.min(100, +q.limit || 20) });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const branchBody = z.object({
  code: z.string().min(2).max(12), name: z.string().min(2), address: z.string().optional(),
  municipality: z.string().optional(), province: z.string().optional(), phone: z.string().optional(), hours: z.string().optional(),
  image: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  verified: z.boolean().optional(), status: z.enum(["active", "inactive", "archived"]).optional(),
});
const toDoc = ({ lat, lng, ...d }: z.infer<typeof branchBody>) => ({ ...d, location: { type: "Point", coordinates: [lng, lat] } });

r.get("/dashboard", can("inquiries:read"), async (req, res) => {
  const f = branchScope(req.user!);
  const [branches, newInquiries, byStatus] = await Promise.all([
    Branch.countDocuments({ status: "active", ...branchScope(req.user!, "_id") }),
    Inquiry.countDocuments({ ...f, status: "new" }),
    Inquiry.aggregate([{ $match: f }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  res.json({ branches, newInquiries, byStatus });
});
r.get("/branches", can("branches:read"), async (req, res) => {
  const { p, n } = page(req.query);
  const f = branchScope(req.user!, "_id");
  const [items, total] = await Promise.all([Branch.find(f).sort("name").skip((p - 1) * n).limit(n), Branch.countDocuments(f)]);
  res.json({ items, total, page: p });
});
r.post("/branches", can("branches:write"), async (req, res) => {
  const d = toDoc(branchBody.parse(req.body));
  const b = await Branch.create({ ...d, slug: slugify(d.name), createdBy: req.user!.id, updatedBy: req.user!.id });
  await audit_(req.user!.id, "branch.create", b.id);
  res.status(201).json(b);
});
r.patch("/branches/:id", can("branches:write"), async (req, res) => {
  const d = toDoc(branchBody.parse(req.body));
  const b = await Branch.findOneAndUpdate({ _id: req.params.id, ...branchScope(req.user!, "_id") }, { ...d, updatedBy: req.user!.id }, { new: true });
  if (!b) return void res.status(404).json({ error: "Not found" });
  await audit_(req.user!.id, "branch.update", b.id);
  res.json(b);
});
r.get("/inquiries", can("inquiries:read"), async (req, res) => {
  const { p, n } = page(req.query);
  const f: any = branchScope(req.user!);
  if (typeof req.query.status === "string") f.status = req.query.status;
  const [items, total] = await Promise.all([Inquiry.find(f).sort("-createdAt").skip((p - 1) * n).limit(n), Inquiry.countDocuments(f)]);
  res.json({ items, total, page: p });
});
r.patch("/inquiries/:id/status", can("inquiries:write"), async (req, res) => {
  const { status } = z.object({ status: z.enum(["new", "in_review", "contacted", "resolved", "closed"]) }).parse(req.body);
  const i = await Inquiry.findOneAndUpdate({ _id: req.params.id, ...branchScope(req.user!) },
    { status, $push: { timeline: { action: `status:${status}`, by: req.user!.id } } }, { new: true });
  if (!i) return void res.status(404).json({ error: "Not found" });
  await audit_(req.user!.id, "inquiry.status", i.id, { status });
  res.json(i);
});
r.get("/audit-logs", can("audit:read"), async (_q, res) => void res.json(await AuditLog.find().sort("-createdAt").limit(100)));
export default r;
