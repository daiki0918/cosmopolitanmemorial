import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { ADMIN_ACCESS_AUDIENCE, JWT_ISSUER, SESSION_MAX_AGE_SECONDS } from "../config/auth.js";
import { ROLE_PERMISSIONS, GLOBAL_ROLES, Permission, Role } from "../config/permissions.js";
import { User } from "../models/index.js";

export interface AuthUser { id: string; name: string; email: string; role: Role; branches: string[]; mustChangePassword: boolean; tokenVersion: number }
declare global { namespace Express { interface Request { user?: AuthUser } } }

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return void res.status(401).json({ error: "Unauthenticated" });
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], issuer: JWT_ISSUER, audience: ADMIN_ACCESS_AUDIENCE }) as { sub: string; tv: number; authAt: number };
    const now = Math.floor(Date.now() / 1000);
    if (typeof p.sub !== "string" || !Number.isInteger(p.tv) || !Number.isInteger(p.authAt) ||
      p.authAt > now || now - p.authAt >= SESSION_MAX_AGE_SECONDS) return void res.status(401).json({ error: "Session invalid" });
    const u = await User.findById(p.sub);
    if (!u || !u.active || u.tokenVersion !== p.tv) return void res.status(401).json({ error: "Session invalid" });
    req.user = { id: u.id, name: u.name, email: u.email, role: u.role as Role, branches: u.branches.map(String), mustChangePassword: u.mustChangePassword, tokenVersion: u.tokenVersion };
    next();
  } catch { res.status(401).json({ error: "Session invalid" }); }
};
export const can = (perm: Permission) => (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.mustChangePassword) return void res.status(403).json({ error: "Change your password before continuing" });
  return ROLE_PERMISSIONS[req.user!.role].includes(perm) ? next() : void res.status(403).json({ error: "Forbidden" });
};

/** Mongo filter limiting a query to the caller's branches; enforced server-side. */
export const branchScope = (u: AuthUser, field = "branch") =>
  GLOBAL_ROLES.includes(u.role) ? {} : { [field]: { $in: u.branches.map((b) => new Types.ObjectId(b)) } };

export const errorHandler = (err: any, _req: Request, res: Response, _n: NextFunction) => {
  if (err?.code === 11000) return void res.status(409).json({ error: "Duplicate value" });
  if (err?.name === "ZodError") {
    const details = err.issues.map((issue: { path: (string | number)[]; message: string }) =>
      `${issue.path.join(".") || "Request"}: ${issue.message}`).join("; ");
    return void res.status(400).json({ error: details || "Validation failed" });
  }
  console.error(err?.message);
  res.status(500).json({ error: "Internal server error" });
};
