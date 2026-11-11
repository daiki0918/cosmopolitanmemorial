import { Router, Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env.js";
import { ADMIN_ACCESS_AUDIENCE, ADMIN_REFRESH_AUDIENCE, JWT_ISSUER, SESSION_MAX_AGE_SECONDS } from "../config/auth.js";
import { User, audit_ } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const SESSION_MS = SESSION_MAX_AGE_SECONDS * 1000;
const WEB = new URL(env.WEB_ORIGIN).origin;
const cookie = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api/v1/auth", maxAge: SESSION_MS };
const { maxAge: _maxAge, ...clearCookieOptions } = cookie;

// Verified against when the account doesn't exist, so response time doesn't reveal valid emails.
const DUMMY_HASH = await argon2.hash(crypto.randomBytes(16).toString("hex"), { type: argon2.argon2id });

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

const sign = (u: any, jti: string, authAt: number) => ({
  access: jwt.sign({ sub: u.id, tv: u.tokenVersion, authAt }, env.JWT_ACCESS_SECRET, { expiresIn: "15m", algorithm: "HS256", issuer: JWT_ISSUER, audience: ADMIN_ACCESS_AUDIENCE }),
  refresh: jwt.sign({ sub: u.id, tv: u.tokenVersion, jti, authAt }, env.JWT_REFRESH_SECRET, { expiresIn: "7d", algorithm: "HS256", issuer: JWT_ISSUER, audience: ADMIN_REFRESH_AUDIENCE }),
});

/** CSRF defence on top of SameSite=Strict: browsers must send an allowed Origin and our custom header. */
const csrfGuard = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (req.get("x-requested-with") !== "fetch" || origin !== WEB)
    return void res.status(403).json({ error: "Forbidden" });
  next();
};

const ipLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const emailLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => "email:" + String(req.body?.email ?? "").toLowerCase().slice(0, 254),
});

r.post("/login", csrfGuard, ipLimiter, emailLimiter, async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Email and password are required" });
  const { email, password } = parsed.data;

  const u = await User.findOne({ email }).select("+passwordHash");
  const locked = !!u?.lockUntil && u.lockUntil > new Date();
  const valid = await argon2.verify(u?.passwordHash ?? DUMMY_HASH, password); // always runs
  const ok = !!u && u.active && !locked && valid;
  const meta = { ip: req.ip, ...(u && !ok ? { reason: locked ? "locked" : !u.active ? "inactive" : "bad_password" } : {}) };
  await audit_(u?.id, ok ? "auth.login.success" : "auth.login.failure", email, meta);

  if (!ok || !u) {
    if (u && !locked && !valid) {
      const upd = await User.findByIdAndUpdate(u._id, { $inc: { failedLogins: 1 } }, { new: true });
      if (upd && upd.failedLogins >= MAX_FAILS)
        await User.updateOne({ _id: u._id }, { $set: { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MS) } });
    }
    return void res.status(401).json({ error: "Invalid credentials" });
  }

  const jti = crypto.randomUUID();
  await User.updateOne({ _id: u._id }, { $set: { failedLogins: 0, refreshJti: jti }, $unset: { lockUntil: 1 } });
  const t = sign(u, jti, Math.floor(Date.now() / 1000));
  res.set("Cache-Control", "no-store");
  res.cookie("rt", t.refresh, cookie).json({ accessToken: t.access, user: { id: u.id, name: u.name, role: u.role, mustChangePassword: u.mustChangePassword } });
});

/** Rotates the refresh token on every use; a replayed (already-rotated) token revokes all sessions. */
r.post("/refresh", csrfGuard, async (req, res) => {
  let p: { sub: string; tv: number; jti: string; authAt: number };
  try {
    const token = req.cookies.rt;
    if (typeof token !== "string") throw new Error("Missing refresh token");
    p = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"], issuer: JWT_ISSUER, audience: ADMIN_REFRESH_AUDIENCE }) as typeof p;
    if (typeof p.sub !== "string" || typeof p.jti !== "string" || !Number.isInteger(p.tv) ||
      !Number.isInteger(p.authAt) || p.authAt > Math.floor(Date.now() / 1000) ||
      Math.floor(Date.now() / 1000) - p.authAt >= SESSION_MAX_AGE_SECONDS) throw new Error("Invalid refresh claims");
  } catch {
    res.clearCookie("rt", clearCookieOptions).set("Cache-Control", "no-store").status(401).json({ error: "Session invalid" });
    return;
  }

  const jti = crypto.randomUUID();
  const u = await User.findOneAndUpdate(
    { _id: p.sub, active: true, tokenVersion: p.tv, refreshJti: p.jti },
    { $set: { refreshJti: jti } }, { new: true });
  if (!u) {
    await User.updateOne({ _id: p.sub }, { $inc: { tokenVersion: 1 }, $unset: { refreshJti: 1 } });
    await audit_(p.sub, "auth.refresh.reuse", p.sub, { ip: req.ip });
    res.clearCookie("rt", clearCookieOptions).set("Cache-Control", "no-store").status(401).json({ error: "Session invalid" });
    return;
  }
  const t = sign(u, jti, p.authAt);
  res.set("Cache-Control", "no-store").cookie("rt", t.refresh, {
    ...cookie,
    maxAge: Math.max(0, (p.authAt + SESSION_MAX_AGE_SECONDS - Math.floor(Date.now() / 1000)) * 1000),
  }).json({ accessToken: t.access });
});

r.post("/logout", csrfGuard, requireAuth, async (req, res) => {
  await User.updateOne({ _id: req.user!.id }, { $inc: { tokenVersion: 1 }, $unset: { refreshJti: 1 } });
  await audit_(req.user!.id, "auth.logout", req.user!.id, { ip: req.ip });
  res.clearCookie("rt", clearCookieOptions).status(204).end();
});

r.post("/change-password", csrfGuard, requireAuth, async (req, res) => {
  const parsed = z.object({ current: z.string().min(1).max(256), next: z.string().min(12).max(256) }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Password must be 12 to 256 characters" });
  const user = await User.findById(req.user!.id).select("+passwordHash");
  if (!user || !await argon2.verify(user.passwordHash, parsed.data.current))
    return void res.status(401).json({ error: "Current password is incorrect" });
  if (await argon2.verify(user.passwordHash, parsed.data.next))
    return void res.status(400).json({ error: "Choose a password you have not used before" });

  const updated = await User.updateOne(
    { _id: user._id, tokenVersion: req.user!.tokenVersion },
    { $set: { passwordHash: await argon2.hash(parsed.data.next, { type: argon2.argon2id }), mustChangePassword: false },
      $inc: { tokenVersion: 1 }, $unset: { refreshJti: 1 } });
  if (!updated.modifiedCount) return void res.status(401).json({ error: "Session invalid" });
  await audit_(user.id, "auth.password.change", user.id, { ip: req.ip });
  res.clearCookie("rt", clearCookieOptions).set("Cache-Control", "no-store").status(204).end();
});

r.get("/me", requireAuth, (req, res) => void res.json(req.user));

export default r;