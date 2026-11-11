import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";

const r = Router();
const NEXT = "/admin";
const WEB = new URL(env.WEB_ORIGIN).origin;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = (n: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Admin sign in</title>
<style nonce="${n}">
  :root{--navy:#08112d;--brand:#2d3ce6;--ink:#0f172a;--muted:#64748b;--line:#cbd5e1}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#fff}
  .shell{display:grid;min-height:100vh;grid-template-columns:1fr}
  @media(min-width:960px){.shell{grid-template-columns:1fr 1fr}}

  /* brand panel (desktop only) */
  aside{display:none;position:relative;overflow:hidden;flex-direction:column;justify-content:space-between;padding:48px;background:var(--navy);color:#fff}
  @media(min-width:960px){aside{display:flex}}
  aside::before{content:"";position:absolute;width:420px;height:420px;right:-120px;top:-120px;border-radius:50%;background:var(--brand);opacity:.3;filter:blur(80px)}
  aside::after{content:"";position:absolute;inset:0;opacity:.06;background-image:radial-gradient(circle at 1px 1px,#fff 1px,transparent 0);background-size:24px 24px}
  aside>*{position:relative;z-index:1}
  .brand{display:flex;align-items:center;gap:12px;font-weight:700;line-height:1.25;color:#fff;text-decoration:none}
  .brand img{height:48px;width:auto;filter:brightness(0) invert(1)}
  .hero h2{margin:0;font:700 2.25rem/1.2 Georgia,"Times New Roman",serif}
  .hero p{margin:16px 0 0;max-width:28rem;color:rgba(255,255,255,.7)}
  .legal{margin:0;font-size:.75rem;color:rgba(255,255,255,.5)}

  /* mobile top bar */
  .topbar{display:flex;align-items:center;gap:12px;padding:16px 24px;background:var(--navy);color:#fff;font-weight:700;line-height:1.25}
  .topbar img{height:36px;width:auto;filter:brightness(0) invert(1)}
  .topbar small{display:block;font-weight:400;color:rgba(255,255,255,.6)}
  @media(min-width:960px){.topbar{display:none}}

  /* form side */
  .pane{display:flex;flex-direction:column;background:#f8fafc}
  @media(min-width:960px){.pane{background:#fff}}
  .center{flex:1;display:grid;place-items:center;padding:24px}
  .box{width:100%;max-width:384px}
  h1{margin:0;font:700 1.9rem/1.2 Georgia,"Times New Roman",serif;color:var(--navy)}
  .sub{margin:8px 0 0;color:var(--muted);font-size:.9rem}
  label{display:block;margin:20px 0 0;font-size:.875rem;font-weight:600;color:#334155}
  .field{position:relative;margin-top:6px}
  .ico{position:absolute;left:12px;top:50%;width:18px;height:18px;transform:translateY(-50%);color:#94a3b8;pointer-events:none}
  input{width:100%;padding:11px 12px 11px 40px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:.9rem;transition:border-color .15s,box-shadow .15s}
  input::placeholder{color:#94a3b8}
  input:focus{outline:0;border-color:var(--brand);box-shadow:0 0 0 3px rgba(45,60,230,.18)}
  #password{padding-right:44px}
  #tg{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:6px;background:transparent;color:#94a3b8;cursor:pointer}
  #tg:hover{background:#f1f5f9;color:#334155}
  #tg:focus-visible{outline:2px solid var(--brand)}
  #tg svg{width:18px;height:18px}
  .slash{display:none}
  #tg[aria-pressed="true"] .slash{display:block}
  #caps{display:none;margin:6px 0 0;font-size:.75rem;font-weight:600;color:#b45309}
  #caps.on{display:block}
  #err{margin:16px 0 0;padding:10px 12px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:.875rem;box-shadow:inset 0 0 0 1px rgba(220,38,38,.2)}
  #err:empty{display:none}
  .btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:24px;padding:12px;border:0;border-radius:8px;background:var(--brand);color:#fff;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.1);transition:background .15s}
  .btn:hover{background:var(--navy)}
  .btn:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
  .btn:disabled{opacity:.6;cursor:not-allowed}
  .spin{display:none;width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:s .7s linear infinite}
  .btn.busy .spin{display:inline-block}
  @keyframes s{to{transform:rotate(360deg)}}
  @media(prefers-reduced-motion:reduce){.spin{animation-duration:2.5s}}
  .back{margin:32px 0 0;text-align:center;font-size:.875rem}
  .back a{color:var(--brand);font-weight:600;text-decoration:none}
  .back a:hover{text-decoration:underline}
  .note{margin:12px 0 0;text-align:center;font-size:.75rem;color:#94a3b8}
</style>
</head>
<body>
<div class="shell">
  <aside>
    <a class="brand" href="${esc(WEB)}"><img src="${esc(WEB)}/logo-white.png" alt=""><span>Cosmopolitan<br>Funeral Homes, Inc.</span></a>
    <div class="hero">
      <h2>Caring for families, one branch at a time.</h2>
      <p>Manage branches, respond to inquiries and keep your services, products and answers up to date, all in one place.</p>
    </div>
    <p class="legal">&copy; Cosmopolitan Funeral Homes, Inc. Authorized staff only.</p>
  </aside>

  <div class="pane">
    <div class="topbar"><img src="${esc(WEB)}/logo-white.png" alt=""><span>Cosmopolitan Funeral Homes<small>Admin console</small></span></div>
    <main class="center">
      <div class="box">
        <h1>Welcome back</h1>
        <p class="sub">Sign in to your admin account to continue.</p>
        <form id="f" method="post" data-next="${esc(NEXT)}" novalidate>
          <label for="email">Email</label>
          <div class="field">
            <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
            <input id="email" name="email" type="email" autocomplete="username" maxlength="254" placeholder="you@example.com" required autofocus>
          </div>

          <label for="password">Password</label>
          <div class="field">
            <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
            <input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" required>
            <button id="tg" type="button" aria-label="Show password" aria-pressed="false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path class="slash" d="M4 4l16 16"/></svg>
            </button>
          </div>
          <p id="caps" aria-live="polite">Caps Lock is on.</p>

          <p id="err" role="alert" aria-live="polite"></p>
          <button id="btn" class="btn" type="submit"><span class="spin" aria-hidden="true"></span><span id="lbl">Sign in</span></button>
        </form>
        <noscript><p class="note">JavaScript is required to sign in.</p></noscript>
        <p class="back"><a href="${esc(WEB)}">&larr; Back to website</a></p>
        <p class="note">Forgot your password? Ask a super admin to reset it for you.</p>
      </div>
    </main>
  </div>
</div>
<script nonce="${n}">
const f = document.getElementById("f"), err = document.getElementById("err"), btn = document.getElementById("btn"),
  lbl = document.getElementById("lbl"), tg = document.getElementById("tg"), caps = document.getElementById("caps"), pw = f.password;

function setShown(show) {
  pw.type = show ? "text" : "password";
  tg.setAttribute("aria-pressed", String(show));
  tg.setAttribute("aria-label", show ? "Hide password" : "Show password");
}
tg.addEventListener("click", () => setShown(pw.type === "password"));

const onKey = (e) => caps.classList.toggle("on", !!(e.getModifierState && e.getModifierState("CapsLock")));
pw.addEventListener("keydown", onKey);
pw.addEventListener("keyup", onKey);
pw.addEventListener("blur", () => caps.classList.remove("on"));

function busy(on) {
  btn.disabled = on;
  btn.classList.toggle("busy", on);
  lbl.textContent = on ? "Signing in\u2026" : "Sign in";
}

f.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";
  const email = f.email.value.trim(), password = pw.value;
  if (!email || !password) { err.textContent = "Enter your email and password."; return; }
  busy(true);
  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) { pw.value = ""; location.replace(f.dataset.next); return; }
    err.textContent = res.status === 429 ? "Too many attempts. Please try again later."
      : res.status === 400 ? "Enter a valid email and password."
      : "Invalid credentials or account temporarily locked.";
  } catch { err.textContent = "Network error. Please try again."; }
  pw.value = "";
  setShown(false);
  busy(false);
  pw.focus();
});
</script>
</body>
</html>`;

r.get("/", (_q, res) => {
  const n = crypto.randomBytes(16).toString("base64");
  res.set({
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${n}'; style-src 'nonce-${n}'; img-src ${WEB}; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`,
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  }).type("html").send(page(n));
});

export default r;