import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import { IconClock, IconFlower, IconHeart, IconPhone, IconPin, IconShield } from "../components/Icons";
type Icon = (p: { className?: string }) => JSX.Element;
const btn = "btn inline-flex items-center rounded-full px-7 py-3 font-medium shadow-sm";
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
  return (<>
    <section className="relative isolate flex min-h-[44rem] items-center overflow-hidden bg-[#050b24] text-white lg:min-h-[min(100svh,60rem)]">
      {/* Full-bleed photo */}
      <img
        src="/home_logo.png"
        alt="Cosmopolitan Funeral Parlour building"
        fetchPriority="high"
        decoding="async"
        className="hero-zoom absolute inset-0 -z-30 h-full w-full object-cover object-[65%_center]"
      />
      {/* Overlays: left-to-right on desktop, flat tint on mobile, bottom fade */}
      <div aria-hidden className="absolute inset-0 -z-20 bg-[#050b24]/65 md:hidden" />
      <div aria-hidden className="absolute inset-0 -z-20 hidden bg-gradient-to-r from-[#050b24]/95 via-[#050b24]/55 to-transparent md:block" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-20 h-56 bg-gradient-to-t from-[#050b24] to-transparent" />

      {/* Floating glass card */}
      <Reveal delay={500} className="absolute right-6 top-28 z-10 hidden lg:right-10 lg:block">
        <Link
          to="/branches"
          className="group flex items-center gap-4 rounded-2xl border border-white/25 bg-white/10 p-3 pr-5 shadow-2xl backdrop-blur-md transition hover:bg-white/20"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15">
            <IconPin className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Find a branch</span>
            <span className="block text-xs text-white/70">Contact details and directions</span>
          </span>
          <span aria-hidden className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 transition group-hover:bg-white group-hover:text-[#050b24]">→</span>
        </Link>
      </Reveal>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-28 pt-28 sm:px-8 lg:px-10">
        <div className="max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[.3em] text-white/80">
              Compassion <span className="mx-2 text-white/40">•</span> Dignity <span className="mx-2 text-white/40">•</span> Care
            </p>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mt-6 font-heading text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              With compassion,
              <span className="block bg-gradient-to-r from-[#e8d9b8] via-[#f5ecd8] to-sky-200 bg-clip-text text-transparent">
                in your time of need.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
              We are here to guide your family with dignity and care. Explore our services, find a branch near you, or send us a message and we will respond as soon as possible.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link to="/services" className={`${btn} bg-white text-[#050b24] transition hover:bg-[#f5ecd8]`}>
                View services <span aria-hidden className="ml-3">→</span>
              </Link>
              <a href="tel:09178038524" className="group inline-flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur transition group-hover:bg-white/25">
                  <IconPhone className="h-5 w-5" />
                </span>
                <span className="text-left text-sm leading-tight">
                  <span className="block font-medium">Call us</span>
                  <span className="block text-xs text-white/65">0917 803 8524</span>
                </span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/15 bg-[#050b24]/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <span className="font-heading text-2xl font-semibold">1951</span>
          <span className="h-8 w-px bg-white/25" />
          <span className="text-[.65rem] font-semibold uppercase leading-5 tracking-[.16em] text-white/65">
            Serving families with compassion and care
          </span>
        </div>
      </div>
    </section>

    <section id="assistance" aria-label="Immediate assistance" className="mx-auto -mt-5 max-w-6xl px-5">
      <div className="grid gap-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-lg shadow-navy/5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-7 sm:py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Here for your family</p>
          <h2 className="mt-1 font-heading text-xl font-bold text-navy">Need help speaking with someone?</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Call our General Director’s mobile lines or find the nearest branch.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="tel:09178038524" className="btn inline-flex items-center rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy">Call 0917 803 8524</a>
          <Link to="/branches" className="btn inline-flex items-center rounded-full border border-brand/20 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-brand/5">Find a branch</Link>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 py-16">
      <ul className="grid gap-6 md:grid-cols-3">{cards.map(([Icon, t, d, to, cta], i) => (
        <Reveal as="li" delay={i * 120} key={t} className="card-hover rounded-2xl border border-brand/10 bg-white p-7 shadow-sm">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon className="h-6 w-6" /></span>
          <h2 className="mt-4 font-heading text-xl font-bold text-navy">{t}</h2><p className="mt-2 text-slate-600">{d}</p>
          <Link to={to} className="mt-4 inline-block font-medium text-brand underline underline-offset-4">{cta} →</Link>
        </Reveal>))}</ul>
    </section>

    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal><h2 className="text-center font-heading text-2xl font-bold text-navy md:text-3xl">Why families choose us</h2></Reveal>
        <ul className="mt-10 grid gap-8 sm:grid-cols-3">{highlights.map(([Icon, t, d], i) => (
          <Reveal as="li" delay={i * 120} key={t} className="text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-md"><Icon className="h-7 w-7" /></span>
            <h3 className="mt-4 font-heading font-bold text-navy">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p>
          </Reveal>))}</ul>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 py-16">
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
          ].map(([number, title, description]) => <li key={number} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{number}</span>
            <span><span className="block font-semibold text-navy">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span></span>
          </li>)}
        </ol>
      </Reveal>
    </section>



    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal className="card-hover overflow-hidden rounded-3xl bg-gradient-to-r from-navy to-brand p-8 text-white shadow-lg md:flex md:items-center md:justify-between md:p-12">
        <div><h2 className="font-heading text-2xl font-bold md:text-3xl">Need help right now?</h2><p className="mt-2 text-white/80">Send us a message and a member of our team will get back to you.</p></div>
        <Link to="/contact" className={`${btn} mt-6 bg-white text-navy hover:bg-ivory md:mt-0`}>Get in touch</Link>
      </Reveal>
    </section>
  </>);
}
