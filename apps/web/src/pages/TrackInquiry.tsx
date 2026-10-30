import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Reveal from "../components/Reveal";

type InquiryStatus = "new" | "in_review" | "contacted" | "resolved" | "closed";
type Inquiry = { reference: string; status: InquiryStatus; createdAt: string };
const statusDetails: Record<InquiryStatus, { title: string; description: string }> = {
  new: { title: "Received", description: "Your inquiry has been received and is waiting for the team to review it." },
  in_review: { title: "Being reviewed", description: "The team is reviewing your inquiry." },
  contacted: { title: "Contact initiated", description: "The team has recorded that they have reached out to you." },
  resolved: { title: "Resolved", description: "The team has marked this inquiry as resolved. Contact us if you still need help." },
  closed: { title: "Closed", description: "This inquiry has been closed. Contact us if you need further assistance." },
};

export default function TrackInquiry() {
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<Inquiry | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    const normalized = reference.trim().toUpperCase();
    if (!/^CFH-[A-F0-9]{10}$/.test(normalized)) {
      setError("Enter the reference number in the format CFH-XXXXXXXXXX.");
      return;
    }

    setBusy(true);
    try {
      setResult(await api<Inquiry>(`/public/requests/${encodeURIComponent(normalized)}`));
    } catch (x) {
      const message = (x as Error).message;
      setError(message === "Not found" ? "We couldn't find an inquiry with that reference. Check the number and try again." : "We couldn't check the inquiry right now. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  const details = result ? statusDetails[result.status] : null;
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Reveal className="rounded-3xl bg-gradient-to-br from-navy to-brand px-6 py-9 text-white sm:px-10 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/65">Inquiry support</p>
        <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Check your inquiry status</h1>
        <p className="mt-3 max-w-xl leading-7 text-white/80">Enter the reference number you received after sending a message to see its latest status.</p>
      </Reveal>

      <Reveal className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-navy" htmlFor="inquiry-reference">Inquiry reference number
            <input id="inquiry-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="CFH-XXXXXXXXXX" autoComplete="off" required maxLength={14} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 uppercase" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="rounded-full bg-brand px-6 py-3 font-medium text-white hover:bg-navy disabled:opacity-60">{busy ? "Checking…" : "Check status"}</button>
        </form>
        <p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">Your reference number is printed in the confirmation after you submit an inquiry. Keep it private; anyone with the number can view its status.</p>
      </Reveal>

      {result && details && <Reveal className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Latest update</p>
        <h2 className="mt-2 font-heading text-2xl font-bold text-navy">{details.title}</h2>
        <p className="mt-2 leading-7 text-slate-600">{details.description}</p>
        <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Reference</dt><dd className="mt-1 font-semibold text-navy">{result.reference}</dd></div>
          <div><dt className="text-slate-500">Submitted</dt><dd className="mt-1 font-semibold text-navy">{new Date(result.createdAt).toLocaleDateString()}</dd></div>
        </dl>
        <p className="mt-5 text-sm text-slate-500">Need assistance? <Link to="/contact" className="font-medium text-brand underline underline-offset-4">Contact our team</Link>.</p>
      </Reveal>}
    </section>
  );
}
