import { lazy, Suspense, useState } from "react";
import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import { IconClock, IconFlower, IconHeart, IconPhone, IconPin, IconShield } from "../components/Icons";
import { api } from "../lib/api";
const BranchMapPreview = lazy(() => import("../components/BranchMapPreview"));
type Icon = (p: { className?: string }) => JSX.Element;
const btn = "btn inline-flex items-center rounded-full px-7 py-3 font-medium shadow-sm";
type Branch = {
  _id: string;
  name: string;
  address?: string;
  municipality?: string;
  province?: string;
  location?: { coordinates?: [number, number] };
};
type Position = { latitude: number; longitude: number };

/** Splits a line into words that animate in one after another (see .word in index.css). */
function Words({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={i}>
          <span className="word" style={{ "--i": start + i } as CSSProperties}>{word}</span>{" "}
        </span>
      ))}
    </>
  );
}

function distanceToBranch(position: Position, branch: Branch) {
  const coordinates = branch.location?.coordinates;
  if (!coordinates) return;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDifference = radians(latitude - position.latitude);
  const longitudeDifference = radians(longitude - position.longitude);
  const a = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(radians(position.latitude)) * Math.cos(radians(latitude)) * Math.sin(longitudeDifference / 2) ** 2;
  const boundedA = Math.min(1, Math.max(0, a));
  return 6371 * 2 * Math.atan2(Math.sqrt(boundedA), Math.sqrt(1 - boundedA));
}

function NearbyBranch() {
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: branches, isLoading, error } = useQuery({ queryKey: ["branches"], queryFn: () => api<Branch[]>("/public/branches"), staleTime: 5 * 60_000, retry: false });
  const nearest = position && branches?.reduce<{ branch: Branch; distance: number } | null>((closest, branch) => {
    const distance = distanceToBranch(position, branch);
    return distance !== undefined && (!closest || distance < closest.distance) ? { branch, distance } : closest;
  }, null);
  const directionsBranch = nearest?.branch.location?.coordinates
    ? { ...nearest.branch, location: { coordinates: nearest.branch.location.coordinates } }
    : null;

  function findNearest() {
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser. You can still browse all branches.");
      return;
    }
    setLocationError("");
    setPosition(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? "Location access was not allowed. You can still browse all branches."
          : "We couldn’t get your location. Please try again or browse all branches.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <section aria-label="Find a nearby branch" className="mx-auto mt-5 max-w-6xl px-5 sm:px-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand ${locating ? "is-locating" : ""}`}><IconPin className="h-5 w-5" /></span>
          <div>
            <h2 className="font-heading font-bold text-navy">Find the nearest branch</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">Share your location to see the closest branch. Your location stays in this browser; distances are straight-line estimates.</p>
            {locationError && <p role="alert" className="result-in mt-2 text-sm text-red-700">{locationError}</p>}
            {error && <p role="alert" className="result-in mt-2 text-sm text-red-700">Branch locations could not be loaded. Please try again later.</p>}
            {nearest && (
              <p key={nearest.branch._id} role="status" className="result-in mt-2 text-sm text-slate-700">
                Closest: <span className="font-semibold text-navy">{nearest.branch.name}</span>
                {nearest.distance < 1 ? ` · ${Math.round(nearest.distance * 1000)} m away` : ` · ${nearest.distance.toFixed(1)} km away`}
                {nearest.branch.address && ` · ${[nearest.branch.address, nearest.branch.municipality, nearest.branch.province].filter(Boolean).join(", ")}`}
              </p>
            )}
            {position && !isLoading && !error && !nearest && <p role="status" className="result-in mt-2 text-sm text-slate-600">No branch locations are available to compare. Browse all branches for help.</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={findNearest} disabled={locating || isLoading} className="btn inline-flex items-center justify-center rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy disabled:cursor-wait disabled:opacity-60">
            {locating && <span aria-hidden className="spinner" />}
            {locating ? "Finding nearby branch…" : position ? "Update my location" : "Use my location"}
          </button>
          {directionsBranch && (
            <button type="button" onClick={() => setPreviewOpen(true)} className="btn result-in inline-flex items-center justify-center rounded-full border border-brand/20 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-brand/5">Get directions</button>
          )}
          <Link to="/branches" className="btn inline-flex items-center justify-center rounded-full border border-brand/20 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-brand/5">All branches</Link>
        </div>
      </div>
      {previewOpen && directionsBranch && (
        <Suspense fallback={<div role="status" className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/70 text-sm font-medium text-white">Loading map preview…</div>}>
          <BranchMapPreview
            branch={directionsBranch}
            directionsUrl={`https://www.openstreetmap.org/directions?to=${directionsBranch.location.coordinates[1]}%2C${directionsBranch.location.coordinates[0]}`}
            onClose={() => setPreviewOpen(false)}
          />
        </Suspense>
      )}
    </section>
  );
}

const cards: [Icon, string, string, string, string][] = [
  [IconHeart, "Guidance when you need it", "Our team helps your family understand every option, at your pace.", "/services", "View services"],
  [IconPin, "Branches near you", "Find a branch, its contact details and directions.", "/branches", "Find a branch"],
  [IconFlower, "Clear information", "Browse packages and memorial products with transparent details.", "/products", "Explore products"],
];
const highlights: [Icon, string, string][] = [
  [IconShield, "Trusted care", "Service standards upheld across every branch."],
  [IconClock, "Here when it matters", "Responsive support through every step of the process."],
  [IconPhone, "Easy to reach", "Message us online or contact a branch directly."],
];
const testimonialExamples = [
  "During a difficult time, the team took the time to explain our options and helped us make arrangements at our own pace.",
  "The staff treated our family with kindness and made sure every detail was handled with care.",
  "We felt supported throughout the process. The team listened, answered our questions and helped us honor someone we love.",
];
export default function Home() {
  return (<div>
    <section className="home-hero relative isolate flex min-h-[44rem] items-center overflow-hidden text-white">
      <img
        src="/home_logo.png"
        alt="Cosmopolitan Funeral Parlour building"
        {...{ fetchpriority: "high" }}
        decoding="async"
        className="home-hero-building hero-zoom absolute inset-0 h-full w-full object-cover object-[65%_center]"
      />
      <span aria-hidden className="home-hero-glow home-hero-glow-one" />
      <span aria-hidden className="home-hero-glow home-hero-glow-two" />

      <div className="home-hero-content relative z-10 mx-auto w-full max-w-6xl px-5 pb-32 pt-20 sm:px-8">
        <div className="home-hero-copy max-w-2xl">
          <Reveal>
            <p className="home-hero-eyebrow">Compassion <span aria-hidden>·</span> Dignity <span aria-hidden>·</span> Care</p>
          </Reveal>

          <h1 className="home-hero-headline mt-6">
            <Words text="With compassion," />
            <span className="home-hero-headline-accent block">
              <Words text="in your time of need." start={2} />
            </span>
          </h1>

          <Reveal delay={700}>
            <p className="home-hero-description mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
              We are here to guide your family with dignity and care. Explore our services, find a branch near you, or send us a message and we will respond as soon as possible.
            </p>
          </Reveal>

          <Reveal delay={900}>
            <div className="home-hero-actions mt-9 flex flex-wrap items-center gap-3 sm:gap-5">
              <Link to="/services" className={`${btn} btn-arrow home-hero-button-primary home-hero-action-primary`}>
                View services <span aria-hidden className="arrow ml-3">→</span>
              </Link>
              <Link to="/branches" className="home-hero-button-glass home-hero-action-branch inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold">
                <span className="home-hero-action-icon"><IconPin className="h-4 w-4" /></span> Find a branch
              </Link>
              <a href="tel:09178038524" className="home-hero-button-glass home-hero-action-call group inline-flex items-center gap-3 rounded-full px-3 py-2">
                <span className="home-hero-action-icon h-10 w-10">
                  <IconPhone className="h-5 w-5" />
                </span>
                <span className="text-left text-sm leading-tight">
                  <span className="block font-medium">Call us</span>
                  <span className="block text-xs text-white/80">0917 803 8524</span>
                </span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/15 bg-[#050b24]/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 sm:px-8">
          <span role="img" aria-label="1951" className="font-heading text-2xl font-semibold">
            <span aria-hidden className="count-up hero-count" style={{ "--to": 1951 } as CSSProperties} />
          </span>
          <span className="h-8 w-px bg-white/25" />
          <span className="text-[.72rem] font-semibold uppercase leading-5 tracking-[.14em] text-white/80">
            Serving families with compassion and care
          </span>
        </div>
      </div>
    </section>

    <section id="assistance" aria-label="Quick help" className="mx-auto mt-8 max-w-6xl px-5 sm:px-8 sm:mt-10">
      <div className="rounded-3xl border border-brand/10 bg-white p-5 shadow-lg shadow-navy/5 sm:p-7 lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Here for your family</p>
          <h2 className="mt-1 font-heading text-xl font-bold text-navy">What would you like to do?</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Choose a next step that works for you.</p>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Call our team", description: "Speak with us at 0917 803 8524", to: "tel:09178038524", Icon: IconPhone },
            { title: "Find a branch", description: "See locations and directions", to: "/branches", Icon: IconPin },
            { title: "Send an inquiry", description: "Ask our team a question", to: "/contact", Icon: IconHeart },
            { title: "Track an inquiry", description: "Check with your reference number", to: "/track-inquiry", Icon: IconClock },
          ].map(({ title, description, to, Icon }) => (
            <li key={title}>
              {to.startsWith("tel:") ? (
                <a href={to} className="card-hover flex h-full items-start gap-3 rounded-2xl border border-brand/10 p-4 hover:border-brand/30 hover:bg-brand/[.03]">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon className="h-5 w-5" /></span>
                  <span><span className="block font-semibold text-navy">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
                </a>
              ) : (
                <Link to={to} className="card-hover flex h-full items-start gap-3 rounded-2xl border border-brand/10 p-4 hover:border-brand/30 hover:bg-brand/[.03]">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon className="h-5 w-5" /></span>
                  <span><span className="block font-semibold text-navy">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>

    <NearbyBranch />

    <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
      <ul className="grid gap-6 md:grid-cols-3">{cards.map(([Icon, t, d, to, cta], i) => (
        <Reveal as="li" delay={i * 120} key={t} className="card-hover rounded-2xl border border-brand/10 bg-white p-7 shadow-sm">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon className="h-6 w-6" /></span>
          <h2 className="mt-4 font-heading text-xl font-bold text-navy">{t}</h2><p className="mt-2 text-slate-600">{d}</p>
          <Link to={to} className="link-arrow mt-4 inline-block font-medium text-brand underline underline-offset-4">{cta} <span aria-hidden className="arrow">→</span></Link>
        </Reveal>))}</ul>
    </section>

    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal><h2 className="text-center font-heading text-2xl font-bold text-navy md:text-3xl">Why families choose us</h2></Reveal>
        <ul className="mt-10 grid gap-8 sm:grid-cols-3">{highlights.map(([Icon, t, d], i) => (
          <Reveal as="li" delay={i * 120} key={t} className="text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-md"><Icon className="h-7 w-7" /></span>
            <h3 className="mt-4 font-heading font-bold text-navy">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p>
          </Reveal>))}</ul>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
      <Reveal className="grid gap-8 rounded-3xl border border-brand/10 bg-white p-6 shadow-sm sm:p-9 md:grid-cols-[.8fr_1.2fr] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-brand">A simple next step</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-navy sm:text-3xl">We’ll help you find the right information.</h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            ["01", "Tell us what you need", "Send a private inquiry with a way for us to reach you."],
            ["02", "Explore your options", "Review services, products, or contact a nearby branch."],
            ["03", "Get in touch", "Our team can follow up about your request."],
          ].map(([number, title, description], i) => <li key={number} className="flex gap-3">
            <span style={{ "--i": i } as CSSProperties} className="step-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{number}</span>
            <span><span className="block font-semibold text-navy">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span></span>
          </li>)}
        </ol>
      </Reveal>
    </section>

    <section className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
      <Reveal className="card-hover overflow-hidden rounded-3xl bg-gradient-to-r from-navy to-brand p-8 text-white shadow-lg md:flex md:items-center md:justify-between md:p-12">
        <div><h2 className="font-heading text-2xl font-bold md:text-3xl">Need help right now?</h2><p className="mt-2 text-white/80">Send us a message and a member of our team will get back to you.</p></div>
        <Link to="/contact" className={`${btn} mt-6 bg-white text-navy hover:bg-ivory md:mt-0`}>Get in touch</Link>
      </Reveal>
    </section>
  </div>);
}
