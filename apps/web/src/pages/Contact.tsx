import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Reveal from "../components/Reveal";
import { IconPhone, IconPin, IconShield } from "../components/Icons";

export default function Contact() {
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (!f.email?.trim() && !f.phone?.trim()) {
      setErr("Please provide an email address or phone number so our team can reach you.");
      form.querySelector<HTMLInputElement>('[name="email"]')?.focus();
      setBusy(false);
      return;
    }
    Object.keys(f).forEach((k) => f[k] === "" && delete f[k]);
    try {
      setRef((await api<{ reference: string }>("/public/inquiries", { method: "POST", body: JSON.stringify(f) })).reference);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (ref) return <Reveal className="mx-auto max-w-3xl rounded-3xl border border-brand/10 bg-white p-6 shadow-sm sm:p-10">
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-800" aria-hidden>✓</span>
    <p role="status" className="mt-4 font-heading text-2xl font-bold text-navy sm:text-3xl">Thank you for reaching out.</p>
    <p className="mt-3 leading-7 text-slate-600">Your message has been received. Your inquiry reference is <strong className="rounded bg-ivory px-2 py-1 font-mono text-navy">{ref}</strong>. Keep it private so you can check your inquiry status.</p>
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
                <input name="name" autoComplete="name" required minLength={2} maxLength={120} className={field} placeholder="Name" />
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
                <input name="email" type="email" autoComplete="email" maxLength={254} className={field} placeholder="you@example.com" />
              </label>
              <label className="block text-sm font-medium text-navy">Phone
                <input name="phone" type="tel" autoComplete="tel" maxLength={30} className={field} placeholder="Your phone number" />
              </label>
            </div>
            <label className="block text-sm font-medium text-navy">Subject *
              <input name="subject" defaultValue={new URLSearchParams(location.search).get("subject") ?? ""} required minLength={3} maxLength={150} className={field} placeholder="How can we help?" />
            </label>
            <label className="block text-sm font-medium text-navy">Message *
              <textarea name="message" required minLength={10} maxLength={3000} rows={5} className={`${field} resize-y`} placeholder="Tell us a little about what you need." />
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-xs leading-5 text-slate-500">Please don’t include passwords, payment card information, or other sensitive personal details.</p>
              <button type="submit" disabled={busy} className="btn inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-7 py-3 font-semibold text-white hover:bg-navy disabled:cursor-wait disabled:opacity-60">{busy ? "Sending inquiry…" : "Send inquiry"}</button>
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
