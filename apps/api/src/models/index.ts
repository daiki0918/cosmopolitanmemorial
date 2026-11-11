import { Schema, model, Types } from "mongoose";
import crypto from "node:crypto";
import { ROLES } from "../config/permissions.js";

export const User = model("User", new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true },
  branches: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
  active: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  failedLogins: { type: Number, default: 0 },
  lockUntil: Date,
  refreshJti: { type: String, select: false },
}, { timestamps: true }));

const branch = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: String, municipality: String, province: String, phone: String, hours: String, image: String,
  location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], required: true } },
  pinAccuracy: { type: String, enum: ["mapped", "approximate"] },
  status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
  verified: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

branch.index({ location: "2dsphere" });
branch.index({ status: 1, verified: 1 });
export const Branch = model("Branch", branch);

const inquiry = new Schema({
  reference: { type: String, unique: true, default: () => "CFH-" + crypto.randomBytes(5).toString("hex").toUpperCase() },
  name: { type: String, required: true }, email: String, phone: String,
  smsConsent: { type: Boolean, default: false }, smsConsentAt: Date,
  subject: { type: String, required: true }, message: { type: String, required: true },
  category: { type: String, enum: ["services", "packages", "payments", "branches", "general"], default: "general" },
  branch: { type: Schema.Types.ObjectId, ref: "Branch" },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["new", "in_review", "contacted", "resolved", "closed"], default: "new" },
  notes: [{ text: String, by: { type: Schema.Types.ObjectId, ref: "User" }, at: { type: Date, default: Date.now } }],
  timeline: [{ action: String, by: { type: Schema.Types.ObjectId, ref: "User" }, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

inquiry.index({ branch: 1, status: 1, createdAt: -1 });
export const Inquiry = model("Inquiry", inquiry);

const auditSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User" }, action: { type: String, required: true },
  target: String, meta: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } });

auditSchema.index({ createdAt: -1 });
export const AuditLog = model("AuditLog", auditSchema);

export const audit_ = (actor: unknown, action: string, target?: string, meta?: object) =>
  AuditLog.create({ actor: typeof actor === "object" && actor ? (actor as any).id : actor, action, target, meta });