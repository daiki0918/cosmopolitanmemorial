import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { Branch, Inquiry, AuditLog, User, audit_ } from "../models/index.js";
import { requireAuth, can, branchScope } from "../middleware/auth.js";
import { ROLE_PERMISSIONS, ROLES } from "../config/permissions.js";
import { sendInquiryStatusEmail } from "../lib/email.js";
import { isSmsConfigured, sendInquiryStatusSms } from "../lib/sms.js";

const r = Router();
r.use(requireAuth);
const page = (q: any) => ({ p: Math.max(1, +q.page || 1), n: Math.min(100, +q.limit || 20) });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const branchBody = z.object({
  code: z.string().min(2).max(12), name: z.string().min(2), address: z.string().optional(),
  municipality: z.string().optional(), province: z.string().optional(), phone: z.string().optional(), hours: z.string().optional(),
  image: z.string().max(500).optional(), pinAccuracy: z.enum(["mapped", "approximate"]).optional(),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  verified: z.boolean().optional(), status: z.enum(["active", "inactive", "archived"]).optional(),
});
const toDoc = ({ lat, lng, ...d }: z.infer<typeof branchBody>) => ({ ...d, location: { type: "Point", coordinates: [lng, lat] } });
const userCreateBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(ROLES),
  password: z.string().min(12).max(256),
});
const userPatchBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  role: z.enum(ROLES).optional(),
  branches: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).refine((ids) => new Set(ids).size === ids.length, "Branch assignments must be unique").optional(),
  active: z.boolean().optional(),
  password: z.string().min(12).max(256).optional(),
}).strict().refine((body) => Object.keys(body).length > 0, "Provide at least one account change");
const userFields = "name email role branches active createdAt updatedAt";

r.get("/users", can("users:manage"), async (_req, res) => {
  const items = await User.find().select(userFields).sort({ name: 1, email: 1 }).lean();
  res.json({ items });
});
r.post("/users", can("users:manage"), async (req, res) => {
  const body = userCreateBody.parse(req.body);
  if (await User.exists({ email: body.email })) return void res.status(409).json({ error: "An account with this email already exists" });
  const { password, ...details } = body;
  const user = await User.create({
    ...details,
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    mustChangePassword: true,
  });
  await audit_(req.user!.id, "user.create", user.id, { email: user.email, role: user.role });
  res.status(201).json({ _id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
});
r.patch("/users/:id", can("users:manage"), async (req, res) => {
  const body = userPatchBody.parse(req.body);
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return void res.status(404).json({ error: "User not found" });
  const target = await User.findById(req.params.id);
  if (!target) return void res.status(404).json({ error: "User not found" });
  if (target.id === req.user!.id && (body.role !== undefined || body.active === false || body.password !== undefined))
    return void res.status(400).json({ error: "Use My account to change your own password; you cannot change your own role or disable your account" });
  if (body.email && await User.exists({ email: body.email, _id: { $ne: target._id } }))
    return void res.status(409).json({ error: "An account with this email already exists" });
  if (body.branches && await Branch.countDocuments({ _id: { $in: body.branches } }) !== body.branches.length)
    return void res.status(400).json({ error: "One or more assigned branches could not be found" });

  const changes: Record<string, unknown> = {};
  if (body.name !== undefined) changes.name = body.name;
  if (body.email !== undefined) changes.email = body.email;
  if (body.role !== undefined) changes.role = body.role;
  if (body.branches !== undefined) changes.branches = body.branches;
  if (body.active !== undefined) changes.active = body.active;
  if (body.password !== undefined) {
    changes.passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    changes.mustChangePassword = true;
  }
  const branchesChanged = body.branches !== undefined && body.branches.map(String).sort().join(",") !== target.branches.map(String).sort().join(",");
  const revokeSessions = body.role !== undefined && body.role !== target.role || branchesChanged || body.active === false || body.password !== undefined;
  const update: Record<string, unknown> = { $set: changes };
  if (revokeSessions) {
    update.$inc = { tokenVersion: 1 };
    update.$unset = { refreshJti: 1 };
  }
  const user = await User.findByIdAndUpdate(target.id, update, { new: true }).select(userFields);
  if (!user) return void res.status(404).json({ error: "User not found" });
  await audit_(req.user!.id, "user.update", user.id, {
    targetName: user.name,
    targetEmail: user.email,
    ...(body.name !== undefined ? { nameChanged: body.name !== target.name } : {}),
    ...(body.email !== undefined ? { emailChanged: body.email !== target.email } : {}),
    ...(body.role !== undefined ? { role: body.role } : {}),
    ...(branchesChanged ? { branchesChanged: true } : {}),
    ...(body.active !== undefined ? { active: body.active } : {}),
    ...(body.password !== undefined ? { passwordReset: true } : {}),
  });
  res.json(user);
});

r.get("/dashboard", async (req, res) => {
  const f = branchScope(req.user!);
  const permissions = ROLE_PERMISSIONS[req.user!.role];
  const canReadBranches = permissions.includes("branches:read");
  const canReadInquiries = permissions.includes("inquiries:read");
  const [branches, newInquiries, byStatus] = await Promise.all([
    canReadBranches ? Branch.countDocuments({ status: "active", ...branchScope(req.user!, "_id") }) : null,
    canReadInquiries ? Inquiry.countDocuments({ ...f, status: "new" }) : null,
    canReadInquiries ? Inquiry.aggregate([{ $match: f }, { $group: { _id: "$status", count: { $sum: 1 } } }]) : [],
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
  await audit_(req.user!.id, "branch.create", b.id, { name: b.name, code: b.code });
  res.status(201).json(b);
});
r.patch("/branches/:id", can("branches:write"), async (req, res) => {
  const d = toDoc(branchBody.parse(req.body));
  const b = await Branch.findOneAndUpdate({ _id: req.params.id, ...branchScope(req.user!, "_id") }, { ...d, updatedBy: req.user!.id }, { new: true });
  if (!b) return void res.status(404).json({ error: "Not found" });
  await audit_(req.user!.id, "branch.update", b.id, { name: b.name, code: b.code });
  res.json(b);
});
r.get("/inquiries", can("inquiries:read"), async (req, res) => {
  const { p, n } = page(req.query);
  const f: any = branchScope(req.user!);
  if (typeof req.query.status === "string") f.status = req.query.status;
  const [items, total] = await Promise.all([
    Inquiry.find(f).populate("branch", "name").sort("-createdAt").skip((p - 1) * n).limit(n),
    Inquiry.countDocuments(f),
  ]);
  res.json({ items, total, page: p });
});
r.patch("/inquiries/:id/status", can("inquiries:write"), async (req, res) => {
  const { status } = z.object({ status: z.enum(["new", "in_review", "contacted", "resolved", "closed"]) }).parse(req.body);
  const filter = { _id: req.params.id, ...branchScope(req.user!) };
  const current = await Inquiry.findOne(filter).select("status");
  if (!current) return void res.status(404).json({ error: "Not found" });
  if (current.status === status) return void res.json({ emailNotification: "not_needed", smsNotification: "not_needed" });
  const i = await Inquiry.findOneAndUpdate({ _id: req.params.id, ...branchScope(req.user!) },
    { status, $push: { timeline: { action: `status:${status}`, by: req.user!.id } } }, { new: true });
  if (!i) return void res.status(404).json({ error: "Not found" });
  let emailNotification: "sent" | "failed" | "not_available" = "not_available";
  let smsNotification: "queued" | "failed" | "invalid_credentials" | "device_not_found" | "network_error" | "timeout" | "not_configured" | "not_opted_in" = "not_opted_in";
  if (i.email) {
    const branch = i.branch ? await Branch.findById(i.branch).select("name").lean() : null;
    try {
      await sendInquiryStatusEmail({
        email: i.email,
        name: i.name,
        reference: i.reference,
        subject: i.subject,
        status: i.status,
        branchName: branch?.name,
      });
      emailNotification = "sent";
    } catch (error) {
      emailNotification = "failed";
      const mailError = error && typeof error === "object"
        ? error as { code?: unknown; responseCode?: unknown; command?: unknown; message?: unknown }
        : {};
      const message = String(mailError.message ?? error ?? "Unknown mail error")
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
        .replace(/\b[A-Za-z0-9+/=_-]{12,}\b/g, "[redacted]")
        .slice(0, 300);
      console.error("Could not send inquiry status notification.", {
        code: mailError.code ?? "MAIL_ERROR",
        responseCode: mailError.responseCode,
        command: mailError.command,
        message,
      });
    }
  }
  if (i.phone && i.smsConsent && !isSmsConfigured()) {
    smsNotification = "not_configured";
  } else if (i.phone && i.smsConsent) {
    try {
      await sendInquiryStatusSms({ phone: i.phone, reference: i.reference, status: i.status });
      smsNotification = "queued";
    } catch (error) {
      const smsError = error && typeof error === "object"
        ? error as { code?: unknown; responseCode?: unknown; networkCode?: unknown }
        : {};
      smsNotification = smsError.responseCode === 401 ? "invalid_credentials"
        : smsError.code === "TEXTBEE_DEVICE_NOT_FOUND" ? "device_not_found"
        : smsError.code === "TEXTBEE_TIMEOUT" ? "timeout"
        : smsError.code === "TEXTBEE_NETWORK_ERROR" ? "network_error"
        : "failed";
      console.error("Could not send inquiry status SMS.", {
        code: smsError.code ?? "TEXTBEE_ERROR",
        responseCode: smsError.responseCode,
        networkCode: smsError.networkCode,
      });
    }
  }
  await audit_(req.user!.id, "inquiry.status", i.id, {
    status,
    reference: i.reference,
    emailNotification,
    smsNotification,
  });
  res.json({ emailNotification, smsNotification });
});
r.get("/audit-logs", can("audit:read"), async (req, res) => {
  const { p, n } = page(req.query);
  const actor = req.query.actor;
  const filter: Record<string, unknown> = {};
  if (typeof actor === "string" && actor !== "all") {
    if (actor === "system") filter.$or = [{ actor: { $exists: false } }, { actor: null }];
    else if (/^[a-f\d]{24}$/i.test(actor)) filter.actor = actor;
    else return void res.status(400).json({ error: "Invalid activity user filter" });
  }
  const [items, total, actorIds] = await Promise.all([
    AuditLog.find(filter).sort("-createdAt").skip((p - 1) * n).limit(n).populate("actor", "name email").lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct("actor", { actor: { $exists: true, $ne: null } }),
  ]);
  const actors = await User.find({ _id: { $in: actorIds } }).select("name email").sort({ name: 1, email: 1 }).lean();
  res.json({ items, total, page: p, actors });
});
export default r;
