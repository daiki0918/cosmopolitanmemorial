import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Reveal from "../components/Reveal";
import Skeleton from "../components/Skeleton";
import { IconFlower, IconHeart, IconPin } from "../components/Icons";
type Item = { _id: string; title: string; description?: string; price?: string; image?: string; kind?: string; inclusions?: string[]; available?: boolean };
const temporaryServices: Item[] = [
  { _id: "preview-arrangement-guidance", title: "Funeral arrangement guidance", description: "A starting point to discuss your family's wishes, service options, and next steps with our team.", image: "/previews/family-guidance.svg" },
  { _id: "preview-memorial-chapel", title: "Memorial chapel services", description: "Ask about chapel arrangements, visitations, and ways to honor your loved one with family and friends.", image: "/previews/memorial-chapel.svg" },
  { _id: "preview-family-support", title: "Family support and coordination", description: "Our team can explain available arrangements and help coordinate details with your chosen branch.", image: "/previews/family-support.svg" },
];
const temporaryProducts: Item[] = [
  { _id: "preview-casket-options", title: "Casket selections", kind: "product", description: "Ask a branch about current casket styles, materials, and options for your family's needs.", image: "/previews/casket-options.svg" },
  { _id: "preview-floral-tributes", title: "Floral tributes", kind: "product", description: "Discuss available floral arrangements and tribute options with the branch coordinating your service.", image: "/previews/floral-tributes.svg" },
  { _id: "preview-memorial-keepsakes", title: "Memorial keepsakes", kind: "product", description: "Ask our team about memorial items that may be available for your service and family.", image: "/previews/memorial-keepsakes.svg" },
];
function Cards({ path, heading, intro, previews }: { path: string; heading: string; intro: string; previews: Item[] }) {
  const { data, isLoading, error } = useQuery({ queryKey: [path], queryFn: () => api<Item[]>(`/public/${path}`) });
  const isPreview = !isLoading && (!data || data.length === 0);
  const items = data?.length ? data : previews;
  return (<section>
    <Reveal><h1 className="font-heading text-3xl font-bold text-navy">{heading}</h1><p className="mt-2 max-w-2xl text-slate-600">{intro}</p></Reveal>
    {isLoading && <Skeleton />}
    {isPreview && <p role={error ? "status" : "note"} className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
      <strong>{error ? "Preview information only. " : "Temporary preview examples. "}</strong>
      {error ? "Published listings could not be loaded. These examples are not a confirmed list of available services or products." : "These examples are not a confirmed list of available services or products. Contact a branch to confirm availability and pricing."}
    </p>}
    <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map((i, idx) => (
      <Reveal as="li" delay={(idx % 3) * 100} key={i._id} className="card-hover overflow-hidden rounded-2xl border border-brand/10 bg-white shadow-sm">
        <div className="img-zoom h-44 w-full bg-brand/5">
          {i.image ? <img src={i.image} alt={isPreview ? `Illustration for ${i.title}` : ""} loading="lazy" className="h-44 w-full object-cover" />
            : <div className="flex h-44 items-center justify-center text-brand/30"><IconFlower className="h-14 w-14" /></div>}
        </div>
        <div className="p-5">
          <h2 className="font-heading text-xl font-bold text-navy">{i.title}</h2>
          {isPreview && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[.68rem] font-semibold uppercase tracking-wide text-amber-900">Preview · Not confirmed</span>}
          {i.kind === "package" && <span className="mt-1 inline-block rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold uppercase text-brand">Package</span>}
          <p className="mt-1 text-slate-600">{i.description}</p>
          {!!i.inclusions?.length && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-600">{i.inclusions.map((x) => <li key={x}>{x}</li>)}</ul>}
          {i.price && <p className="mt-2 font-semibold text-navy">{i.price}</p>}
          <Link to={`/contact?subject=${encodeURIComponent("Inquiry: " + i.title)}`} className="mt-4 inline-flex items-center gap-2 font-semibold text-brand underline underline-offset-4"><IconHeart className="h-4 w-4" />Ask about this option</Link>
        </div>
      </Reveal>))}</ul>
    <Reveal className="mt-8 rounded-2xl border border-brand/10 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-6">
      <div>
        <p className="font-heading text-lg font-bold text-navy">Need help finding the right option?</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">Talk with our team or find your nearest Cosmopolitan branch.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 sm:mt-0">
        <Link to="/branches" className="btn inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy"><IconPin className="h-4 w-4" />Find a branch</Link>
        <Link to="/contact" className="inline-flex items-center rounded-full border border-brand/20 px-5 py-2.5 text-sm font-semibold text-navy hover:bg-brand/5">Contact us</Link>
      </div>
    </Reveal>
  </section>);
}
export const Services = () => <Cards path="services" heading="Services" intro="Explore example service options and contact our team to discuss your family's wishes and the arrangements available at your chosen branch." previews={temporaryServices} />;
export const Products = () => <Cards path="products" heading="Products and packages" intro="Browse example memorial product categories. Availability and selections may vary by branch; contact us to confirm current options and pricing." previews={temporaryProducts} />;

const generalFaqs = [
  { question: "How do I get help arranging funeral services?", answer: "Contact our team through the Contact page or reach out to a branch. We can listen to your needs and explain the options currently available to your family.", category: "services" },
  { question: "What services and memorial products are available?", answer: "Available services and products can vary. Browse the Services and Products pages for currently published information, or contact us for details about your family's needs.", category: "services" },
  { question: "How much do services or packages cost?", answer: "Costs depend on the services and options selected. Please contact us for current pricing and a clear explanation of what is included before making arrangements.", category: "packages" },
  { question: "How can I check the status of an inquiry?", answer: "Use the Track inquiry page and enter the reference number shown in your submission confirmation. Keep that reference private because it can be used to view the inquiry's latest status.", category: "general" },
  { question: "How can I find a branch near me?", answer: "Visit the Branches page to see locations and contact details that have been verified and published. If you need help finding the right branch, send us a message.", category: "branches" },
  { question: "What information should I include when I contact you?", answer: "Share your name, a way for us to reach you, and a short description of what you need. Please avoid sending sensitive personal or financial information through the general inquiry form.", category: "general" },
  { question: "How can I ask about my personal information?", answer: "Use the Contact page and select a privacy-related subject. Please do not include sensitive information in your first message; our team can advise on a suitable way to verify and handle your request.", category: "general" },
];

export function Faq() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["faqs"], queryFn: () => api<{ _id: string; question: string; answer: string; category: string }[]>("/public/faqs") });
  const publishedFaqs = (data ?? []).filter((item) => !generalFaqs.some((faq) => faq.question.toLowerCase() === item.question.toLowerCase()));
  const allFaqs: { id: string; question: string; answer: string; category: string }[] = [
    ...generalFaqs.map((faq) => ({ id: faq.question, ...faq })),
    ...publishedFaqs.map((faq) => ({ id: faq._id, ...faq })),
  ];
  const list = allFaqs.filter((f) => (f.question + f.answer + f.category).toLowerCase().includes(q.trim().toLowerCase()));
  return (<section>
    <Reveal className="rounded-3xl bg-gradient-to-br from-navy to-brand px-6 py-9 text-white sm:px-10 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/65">Here to help</p>
      <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Frequently asked questions</h1>
      <p className="mt-3 max-w-2xl leading-7 text-white/80">Find helpful information about services, packages, branches and getting in touch with our team.</p>
    </Reveal>
    <label className="mt-7 block max-w-xl"><span className="block text-sm font-medium text-navy">Search questions</span>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “packages” or “branch”" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label>
    {isLoading && <p className="mt-4 text-sm text-slate-500">Loading additional answers…</p>}
    {error && <p role="status" className="mt-4 text-sm text-slate-500">Showing general answers. Published company answers could not be loaded.</p>}
    <div className="mt-6 space-y-3">{list.map((f, i) => (
      <Reveal as="details" delay={(i % 5) * 50} key={f.id} className="group rounded-2xl border border-brand/10 bg-white p-5 shadow-sm transition-shadow open:shadow-md sm:p-6">
        <summary className="cursor-pointer list-none font-semibold text-navy marker:content-none">
          <span className="flex items-center justify-between gap-4">{f.question}<span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-lg font-normal text-brand transition-transform group-open:rotate-45">+</span></span>
        </summary>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">{f.answer}</p>
      </Reveal>))}
      {list.length === 0 && <p className="rounded-xl bg-white p-5 text-slate-600">No matching questions. Try a different search or <Link to="/contact" className="font-medium text-brand underline underline-offset-4">contact our team</Link>.</p>}</div>
    <p className="mt-8 text-sm text-slate-500">For details specific to your situation, please <Link to="/contact" className="font-medium text-brand underline underline-offset-4">contact us</Link>.</p>
  </section>);
}
const milestones = [
  ["1951 · The beginning", "Cosmopolitan opens its first memorial chapel on Junquera Street in Cebu City."],
  ["1960–1976 · Vismin expansion", "The company grows into Villa Amalia in Davao City, then opens in Cagayan de Oro and expands to Danao and Mandaue. A chapel is also established in Lapu-Lapu City."],
  ["1980–1984 · Provincial growth", "New chapels bring Cosmopolitan to Argao, Cebu; Bogo; and Iligan City, with services and funeral products made available to more communities."],
  ["1990–1995 · Regional expansion", "The network reaches Carcar, Liloan, and Valencia in Bukidnon, adding chapels and facilities to serve local families."],
  ["2001–2005 · Beyond Cebu", "Expansion includes Ibabao in Mandaue, Camus in Davao City, Liloan and Cordova in Cebu, extending service across Cebu and Mindanao."],
  ["2012–present · Nationwide", "Cosmopolitan continues to grow in Davao, Quezon City, Pasig, and Baguio, bringing its services to more families across the Philippines."],
];
export const About = () => (<section className="space-y-16 pb-10 md:space-y-20">
  <Reveal className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-xl shadow-navy/10">
    <div className="grid md:grid-cols-[1fr_1.05fr]">
      <div className="relative flex flex-col justify-center overflow-hidden px-7 py-10 sm:px-10 md:px-12 md:py-14">
        <span aria-hidden className="motion-orb right-[-4rem] top-[-5rem]" />
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-white/65">75 years of legacy · Serving families since 1951</p>
        <h1 className="mt-5 max-w-lg font-heading text-4xl font-bold leading-[1.08] sm:text-5xl">Our roots. Our people. Our legacy.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-white/75">Since opening our first chapel on Junquera Street in Cebu City, Cosmopolitan Funeral Homes has grown to serve families across the Philippines with compassion, dependable care, and respect at the heart of every service.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/services" className="btn inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy hover:bg-ivory">Explore our services</Link>
          <Link to="/contact" className="btn inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">Get in touch</Link>
        </div>
        </div>
      </div>
      <div className="img-zoom relative min-h-64 md:min-h-[27rem]">
        <img src="/branches/junquera.jpg" alt="The company's original Junquera Street branch building in Cebu City" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" />
        <p className="absolute inset-x-0 bottom-0 p-6 text-sm font-medium text-white sm:p-8">Junquera Street, Cebu City <span className="mt-1 block text-xs font-normal text-white/70">Where our story began in 1951</span></p>
      </div>
    </div>
  </Reveal>

  <div className="grid gap-10 md:grid-cols-[.7fr_1.3fr] md:gap-16">
    <Reveal className="md:sticky md:top-28 md:self-start">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-brand">Our story</p>
      <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-navy md:text-4xl">A legacy built around families.</h2>
      <p className="mt-4 text-slate-600">For 75 years, we have grown with the communities we serve.</p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-brand/10 bg-white p-4">
          <p className="font-heading text-2xl font-bold text-navy">1951</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Our first chapel in Cebu City</p>
        </div>
        <div className="rounded-2xl border border-brand/10 bg-white p-4">
          <p className="font-heading text-2xl font-bold text-navy">Nationwide</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Serving families across the Philippines</p>
        </div>
      </div>
    </Reveal>
    <Reveal className="space-y-5 text-base leading-7 text-slate-600">
      <p>Cosmopolitan Funeral Homes, Inc. began in 1951 with a memorial chapel on Junquera Street in Cebu City. From that beginning, the company steadily expanded to serve families in Cebu, Mindanao, and Luzon.</p>
      <p>We believe families deserve dependable care and thoughtful guidance through difficult moments. Our team continues to build on that commitment through memorial services, funeral products, professional support, and facilities rooted in the communities we serve.</p>
      <div className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Our philosophy</p>
        <p className="mt-3 font-heading text-xl font-semibold leading-relaxed text-navy sm:text-2xl">“Compassionate, dependable care for every family.”</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">Honoring lives and supporting families with dignity and respect.</p>
      </div>
    </Reveal>
  </div>

  <Reveal>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-brand">Our journey</p><h2 className="mt-2 font-heading text-3xl font-bold text-navy">Milestones through the years</h2></div>
      <p className="max-w-md text-sm leading-6 text-slate-500">From one Cebu chapel to a growing nationwide network.</p>
    </div>
    <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {milestones.map(([period, description], i) => (
        <Reveal as="li" delay={(i % 3) * 80} key={period} className="card-hover rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-brand/10 px-3 text-xs font-bold text-brand">{String(i + 1).padStart(2, "0")}</span>
          <p className="mt-5 font-heading text-xl font-bold text-navy">{period}</p><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </Reveal>
      ))}
    </ol>
  </Reveal>

  <Reveal delay={100}>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-brand">Beyond funeral care</p>
      <h2 className="mt-2 font-heading text-3xl font-bold text-navy">Part of the Cosmopolitan family</h2>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">Our affiliated organizations contribute to craftsmanship, education, and long-term care for families.</p>
    </div>
    <ul className="mt-6 grid gap-4 sm:grid-cols-3">
      <li className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
        <h3 className="font-heading text-xl font-bold text-navy">CVI</h3>
        <p className="mt-1 text-sm font-medium text-brand">Creatival Ventures Inc.</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">Locally crafted caskets with Filipino craftsmanship and world-class quality.</p>
      </li>
      <li className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
        <h3 className="font-heading text-xl font-bold text-navy">PCAS</h3>
        <p className="mt-1 text-sm font-medium text-brand">Pacific Center for Advance Studies</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">A school dedicated to professional embalming education and continuing learning.</p>
      </li>
      <li className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
        <h3 className="font-heading text-xl font-bold text-navy">CCLPI</h3>
        <p className="mt-1 text-sm font-medium text-brand">Cosmopolitan CLIMBS Life Plan Inc.</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">Helping families prepare for tomorrow through financial protection and life planning.</p>
      </li>
    </ul>
  </Reveal>
</section>);
export const Privacy = () => (<section className="mx-auto max-w-4xl space-y-8 pb-10">
  <Reveal className="rounded-3xl bg-gradient-to-br from-navy to-brand px-6 py-9 text-white sm:px-10 sm:py-12">
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/65">Your information matters</p>
    <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Privacy policy</h1>
    <p className="mt-3 max-w-2xl leading-7 text-white/80">This page explains what information this website may collect, how inquiries are handled, and how the site uses cookies.</p>
  </Reveal>

  <Reveal className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-sm leading-6 text-amber-950 sm:p-6">
    <p className="font-semibold">Policy draft — company review required</p>
    <p className="mt-1">This general website explanation is not a substitute for a company-approved privacy notice or legal advice. Before publication, Cosmopolitan Funeral Homes-Inc. should confirm its retention periods, authorized recipients and service providers, privacy contact details, and applicable legal obligations.</p>
  </Reveal>

  <div className="grid gap-4 sm:grid-cols-2">
    <Reveal className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-bold text-navy">Information you provide</h2>
      <p className="mt-3 leading-7 text-slate-600">When you send an inquiry, the form asks for your name, subject and message, and at least one way to contact you (email or phone). The message and contact details are stored so authorized staff can review and respond.</p>
    </Reveal>
    <Reveal delay={70} className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-bold text-navy">How information is used</h2>
      <p className="mt-3 leading-7 text-slate-600">Information submitted through the inquiry form is used to follow up on your request and manage its status. Please do not submit passwords, payment card details, government identification numbers or other sensitive information through the general contact form.</p>
    </Reveal>
    <Reveal delay={100} className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-bold text-navy">Cookies and sign-in</h2>
      <p className="mt-3 leading-7 text-slate-600">Public pages do not require an account. When staff sign in, the site uses a necessary authentication cookie to maintain the session; it is marked HttpOnly and SameSite Strict, is limited to authentication routes, and expires after seven days. In production it is also marked Secure. The current website code does not configure advertising or analytics cookies.</p>
      <p className="mt-3 leading-7 text-slate-600">If cookies are disabled, staff sign-in and session renewal may not work. Cookie practices should be reviewed again if analytics, embedded services or other third-party tools are added.</p>
    </Reveal>
    <Reveal delay={150} className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-bold text-navy">Storage and protection</h2>
      <p className="mt-3 leading-7 text-slate-600">Inquiry information is kept in the service's application database and access is intended for authorized staff. The exact retention period, any service providers that process the information, and any cross-border storage arrangements need to be confirmed by the company.</p>
    </Reveal>
    <Reveal delay={180} className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-bold text-navy">Maps and external links</h2>
      <p className="mt-3 leading-7 text-slate-600">When you open the Branches page, your browser loads map tiles from OpenStreetMap servers and connects directly to that service, which may receive technical information such as your IP address. Selecting a location changes the pin shown on the map. Map and directions links open an external site governed by its own privacy practices. See the <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer" className="font-medium text-brand underline underline-offset-4">OpenStreetMap Foundation Privacy Policy</a>.</p>
    </Reveal>
  </div>

  <Reveal className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm sm:p-8">
    <h2 className="font-heading text-xl font-bold text-navy">Your choices and privacy requests</h2>
    <p className="mt-3 leading-7 text-slate-600">You may contact the company to ask about personal information submitted through this site or to make a request available under applicable privacy law. Requests may require identity verification and can be subject to legal exceptions. The company should provide its official privacy contact and a verified request-handling process before launch.</p>
    <Link to="/contact?subject=Privacy%20request" className="btn mt-5 inline-flex items-center rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-navy">Contact us about privacy</Link>
  </Reveal>

  <p className="px-1 text-xs leading-5 text-slate-500">This description reflects the website implementation reviewed on October 28, 2026. It should be checked whenever the site, cookie use, or information-handling practices change.</p>
</section>);
