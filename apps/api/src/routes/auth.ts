import { Router } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env.js";
import { User, audit_ } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true });
const cookie = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api/v1/auth", maxAge: 7 * 864e5 };
const sign = (u: any) => ({
  access: jwt.sign({ sub: u.id, tv: u.tokenVersion }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" }),
  refresh: jwt.sign({ sub: u.id, tv: u.tokenVersion }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" }),
});

r.post("/login", limiter, async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const u = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  const ok = !!u && u.active && (await argon2.verify(u.passwordHash, password));
  await audit_(u?.id, ok ? "auth.login.success" : "auth.login.failure", email);
  if (!ok || !u) return void res.status(401).json({ error: "Invalid credentials" });
  const t = sign(u);
  res.cookie("rt", t.refresh, cookie).json({ accessToken: t.access, user: { id: u.id, name: u.name, role: u.role } });
});
r.post("/refresh", async (req, res) => {
  try {
    const p = jwt.verify(req.cookies.rt, env.JWT_REFRESH_SECRET) as { sub: string; tv: number };
    const u = await User.findById(p.sub);
    if (!u || !u.active || u.tokenVersion !== p.tv) throw new Error();
    res.json({ accessToken: sign(u).access });
  } catch { res.status(401).json({ error: "Session invalid" }); }
});
r.post("/logout", requireAuth, async (req, res) => {
  await User.updateOne({ _id: req.user!.id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie("rt", cookie).status(204).end();
});
r.get("/me", requireAuth, (req, res) => void res.json(req.user));
export default r;
