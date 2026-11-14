import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import Reveal from "../components/Reveal";
import Spinner from "../components/Spinner";
import { IconPhone, IconPin, IconShield } from "../components/Icons";
import { useCookieConsent } from "../components/CookieConsent";
import { GUARDRAILS } from "../../../api/src/config/guardrails";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        action: string;
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
      }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function Contact() {
  const { functionalEnabled, openSettings } = useCookieConsent();
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const captchaContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>();
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const branches = useQuery({
    queryKey: ["public-branches"],
    queryFn: () => api<{ _id: string; name: string; municipality?: string; province?: string }[]>("/public/branches"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!siteKey || !functionalEnabled) {
      setTurnstileToken("");
      setTurnstileError("");
      return;
    }
    let active = true;
    const script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    const element = script ?? document.createElement("script");
    const render = () => {
      if (!active || !captchaContainer.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(captchaContainer.current, {
        sitekey: siteKey,
        action: "inquiry",
        callback: (token) => { setTurnstileToken(token); setTurnstileError(""); },
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => { setTurnstileToken(""); setTurnstileError("Security check failed to load. Please refresh and try again."); },
      });
    };
    const onError = () => setTurnstileError("Security check failed to load. Please refresh and try again.");
    if (window.turnstile) {
      render();
    } else {
      element.addEventListener("load", render);
      element.addEventListener("error", onError);
      if (!script) {
        element.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        element.async = true;
        element.defer = true;
        element.dataset.turnstile = "true";
        document.head.appendChild(element);
      }
    }
    return () => {
      active = false;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      element.removeEventListener("load", render);
      element.removeEventListener("error", onError);
    };
  }, [siteKey, functionalEnabled]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setErr(""); setBusy(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const f = Object.fromEntries(formData) as Record<string, string>;
    if (f.website?.trim()) {
      setErr("We could not verify this inquiry. Please review the form and try again.");
      submitting.current = false; setBusy(false);
      return;
    }
    const spamText = `${f.subject ?? ""} ${f.message ?? ""}`;
    const links = spamText.match(/(?:https?:\/\/|www\.)\S+/gi) ?? [];
    if (links.length > GUARDRAILS.inquiry.maxLinks || new RegExp(`(.)\\1{${GUARDRAILS.inquiry.repeatedCharacterThreshold},}`).test(f.message ?? "")) {
      setErr("Please remove repeated text or excessive links and try again.");
      submitting.current = false; setBusy(false);
      return;
    }
    if (!turnstileToken) {
      setErr("Please complete the security check before sending your inquiry.");
      submitting.current = false;
      setBusy(false);
      return;
    }
    f.turnstileToken = turnstileToken;
    if (!f.email?.trim() && !f.phone?.trim()) {
      setErr("Please provide an email address or phone number so our team can reach you.");
      form.querySelector<HTMLInputElement>('[name="email"]')?.focus();
      submitting.current = false;
      setBusy(false);
      return;
    }
    Object.keys(f).forEach((k) => f[k] === "" && delete f[k]);
    try {
      setRef((await api<{ reference: string }>("/public/inquiries", { method: "POST", body: JSON.stringify({ ...f, smsConsent: formData.has("smsConsent") }) })).reference);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
      setTurnstileToken("");
      submitting.current = false;
      setBusy(false);
    }
  }

  if (ref) return <Reveal className="mx-auto max-w-3xl rounded-3xl border border-brand/10 bg-white p-6 shadow-sm sm:p-10">
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-800" aria-hidden>✓</span>
    <p role="status" className="mt-4 font-heading text-2xl font-bold text-navy sm:text-3xl">Thank you for reaching out.</p>
    <p className="mt-3 leading-7 text-slate-600">Your message has been received. Save this inquiry reference—you’ll need it to check your status:</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <strong className="rounded-lg bg-ivory px-3 py-2 font-mono text-lg text-navy">{ref}</strong>
      <button type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(ref);
          setCopyMessage("Reference copied. Save it somewhere private.");
        } catch {
          setCopyMessage("Copy failed. Please take a screenshot or write down the reference.");
        }
      }} className="rounded-full border border-brand/20 px-4 py-2 text-sm font-semibold text-navy transition hover:bg-brand/5">Copy reference</button>
    </div>
    <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-600">
      {copyMessage || "Please take a screenshot of this page or save the reference number somewhere safe. Keep it private."}
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link to="/track-inquiry" className="btn inline-flex items-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-navy">Track your inquiry</Link>
      <Link to="/branches" className="btn inline-flex items-center rounded-full border border-brand/20 px-6 py-3 text-sm font-semibold text-navy hover:bg-brand/5">View branches</Link>
      <button type="button" onClick={() => setRef("")} className="rounded-full px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100">Send another inquiry</button>
    </div>
  </Reveal>;

  const field = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink placeholder:text-slate-400";
  return (
    <section className="mx-auto max-w-5xl">
      <Reveal className="mb-8 rounded-3xl bg-gradient-to-br from-navy via-[#101d78] to-brand px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/65">We’re here to help</p>
        <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Talk with our team.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-white/80">Tell us what your family needs. Share only the details needed for us to follow up, and we’ll respond through the contact information you provide.</p>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,.65fr)]">
        <Reveal className="rounded-3xl border border-brand/10 bg-white p-5 shadow-sm sm:p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h2 className="font-heading text-2xl font-bold text-navy">Send an inquiry</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Fields marked with * are required. Add an email or phone number so we can reach you.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-navy">Your name *
                <input name="name" autoComplete="name" required minLength={2} maxLength={GUARDRAILS.inquiry.nameMaxCharacters} className={field} placeholder="Name" />
              </label>
              <label className="block text-sm font-medium text-navy">Branch *
                <select name="branch" required defaultValue="" className={field} disabled={branches.isLoading || branches.isError || !branches.data?.length}>
                  <option value="" disabled>{branches.isLoading ? "Loading branches…" : branches.isError ? "Branches unavailable" : "Select a branch"}</option>
                  {branches.data?.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}{[branch.municipality, branch.province].filter(Boolean).length ? ` — ${[branch.municipality, branch.province].filter(Boolean).join(", ")}` : ""}
                    </option>
                  ))}
                </select>
                {branches.isError && <span role="alert" className="mt-1 block text-xs text-red-700">Could not load branches. Please refresh the page before sending your inquiry.</span>}
                {!branches.isLoading && !branches.isError && !branches.data?.length && <span role="alert" className="mt-1 block text-xs text-red-700">No branches are available right now. Please contact us by phone.</span>}
              </label>
              <label className="block text-sm font-medium text-navy">Inquiry type
                <select name="category" defaultValue="general" className={field}>
                  <option value="general">General question</option>
                  <option value="services">Funeral services</option>
                  <option value="packages">Products and packages</option>
                  <option value="payments">Payments</option>
                  <option value="branches">Branch information</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-navy">Email
                <input name="email" type="email" autoComplete="email" maxLength={GUARDRAILS.inquiry.emailMaxCharacters} className={field} placeholder="you@example.com" />
              </label>
              <label className="block text-sm font-medium text-navy">Phone
                <input name="phone" type="tel" autoComplete="tel" maxLength={GUARDRAILS.inquiry.phoneMaxCharacters} className={field} placeholder="09xx xxx xxxx or +639xx xxx xxxx" />
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <input name="smsConsent" type="checkbox" value="true" className="mt-1 h-4 w-4 shrink-0 accent-brand" />
              <span>I agree to receive SMS updates about this inquiry at the phone number above. Philippine mobile numbers can use local or international format. Message and data rates may apply. Contact us through our website to withdraw consent.</span>
            </label>
            <label className="block text-sm font-medium text-navy">Subject *
              <input name="subject" defaultValue={new URLSearchParams(location.search).get("subject") ?? ""} required minLength={3} maxLength={GUARDRAILS.inquiry.subjectMaxCharacters} className={field} placeholder="How can we help?" />
            </label>
            <label className="block text-sm font-medium text-navy">Message *
              <textarea name="message" required minLength={10} maxLength={GUARDRAILS.inquiry.messageMaxCharacters} rows={5} className={`${field} resize-y`} placeholder="Tell us a little about what you need." />
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <div>
              {siteKey
                ? functionalEnabled
                  ? <div ref={captchaContainer} aria-label="Security check" />
                  : <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    The security check loads from Cloudflare after you enable Functional cookies.{" "}
                    <button type="button" onClick={openSettings} className="font-semibold text-brand underline underline-offset-2">Cookie Settings</button>
                  </div>
                : <p role="alert" className="text-sm text-red-700">The security check is not configured. Please contact us by phone.</p>}
              {turnstileError && <p role="alert" className="mt-2 text-sm text-red-700">{turnstileError}</p>}
              {functionalEnabled && <p className="mt-2 text-xs text-slate-500">Protected by Cloudflare Turnstile. See our <Link to="/privacy" className="underline underline-offset-2">privacy policy</Link>.</p>}
            </div>
            {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-xs leading-5 text-slate-500">Please don’t include passwords, payment card information, or other sensitive personal details.</p>
              <button type="submit" disabled={busy || !siteKey || !functionalEnabled || !turnstileToken || !!turnstileError || branches.isLoading || branches.isError || !branches.data?.length} className="btn inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-7 py-3 font-semibold text-white hover:bg-navy disabled:cursor-wait disabled:opacity-60">{busy && <Spinner />}{busy ? "Sending inquiry…" : "Send inquiry"}</button>
            </div>
          </form>
        </Reveal>

        <aside className="space-y-4">
          <Reveal className="rounded-3xl border border-brand/10 bg-white p-6 shadow-sm">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand"><IconPhone className="h-5 w-5" /></span>
            <h2 className="mt-4 font-heading text-xl font-bold text-navy">Prefer to call?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Reach the General Director’s mobile lines for assistance.</p>
            <div className="mt-4 space-y-2 text-sm">
              <a href="tel:09178038524" className="block font-semibold text-brand hover:underline">0917 803 8524 <span className="font-normal text-slate-500">(Globe)</span></a>
              <a href="tel:09499939220" className="block font-semibold text-brand hover:underline">0949 993 9220 <span className="font-normal text-slate-500">(Smart)</span></a>
            </div>
          </Reveal>
          <Reveal delay={80} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-sm">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand"><IconPin className="h-5 w-5" /></span>
            <h2 className="mt-4 font-heading text-xl font-bold text-navy">Find a nearby branch</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Browse branch locations, contact details, and directions across the Philippines.</p>
            <Link to="/branches" className="mt-4 inline-flex font-semibold text-brand underline underline-offset-4">Explore branches →</Link>
          </Reveal>
          <Reveal delay={140} className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-amber-800"><IconShield className="h-5 w-5" /></span>
            <h2 className="mt-4 font-heading text-lg font-bold text-amber-950">Your privacy matters</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">Inquiry details are used to respond to your request. Read our <Link to="/privacy" className="font-semibold underline underline-offset-2">privacy policy</Link>.</p>
          </Reveal>
        </aside>
      </div>
    </section>
  );
}
