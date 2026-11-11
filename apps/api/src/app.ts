import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import auth from "./routes/auth.js";
import loginPage from "./routes/login-page.js";
import pub from "./routes/public.js";
import admin from "./routes/admin.js";
import { adminContent, publicContent } from "./routes/content.js";
import { errorHandler } from "./middleware/auth.js";

export const app = express();
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "https://challenges.cloudflare.com"],
      "frame-src": ["https://challenges.cloudflare.com"],
      "connect-src": ["'self'", "https://challenges.cloudflare.com"],
    },
  },
}));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.get("/health", (_q, r) => void r.json({ ok: true }));
app.use("/admin/login", loginPage);
app.use("/api/v1/auth", (_q, r, n) => { r.set("Cache-Control", "no-store"); n(); }, auth);
app.use("/api/v1/public", pub);
app.use("/api/v1/admin", adminContent);
app.use("/api/v1/public", publicContent);
app.use("/api/v1/admin", admin);
app.use(errorHandler);