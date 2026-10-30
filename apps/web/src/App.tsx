import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Branches from "./pages/Branches";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import TrackInquiry from "./pages/TrackInquiry";
import { About, Faq, Privacy, Products, Services } from "./pages/Public";
import { AdminBranches, AdminContent, AdminInquiries, AdminLayout, Dashboard } from "./pages/Admin";
import ChatWidget from "./components/ChatWidget";

const nav = [["/", "Home"], ["/about", "About"], ["/services", "Services"], ["/products", "Products"], ["/branches", "Branches"], ["/faq", "FAQ"], ["/contact", "Contact"]];
const Page = () => <div className="mx-auto max-w-6xl p-5 md:p-10"><Outlet /></div>;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [pathname]);
  return null;
}

export default function App() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (<>
    <ScrollToTop />
    <a href="#main" className="sr-only focus:not-sr-only p-2">Skip to content</a>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08112d]/95 text-white backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/logo-white.png" alt="" className="h-11 w-auto brightness-0 invert" />
          <span className="font-heading text-sm font-bold leading-tight text-white sm:text-base">Cosmopolitan<br className="sm:hidden" /> Funeral Homes-Inc.</span>
        </Link>
        <button type="button" className="rounded-lg border border-white/25 px-3 py-2 text-white md:hidden" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
        <ul id="menu" className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-1 border-b border-white/10 bg-[#08112d]/95 p-4 shadow-lg md:static md:flex md:flex-row md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          {nav.map(([to, l]) => <li key={to}><NavLink to={to} end onClick={() => setOpen(false)} className={({ isActive }) => `site-nav-link block rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? "bg-brand text-white" : "text-white/85 hover:bg-white/10 hover:text-white"}`}>{l}</NavLink></li>)}
        </ul>
      </nav>
    </header>
    <main id="main"><Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Page />}>
        <Route path="/about" element={<About />} /><Route path="/services" element={<Services />} /><Route path="/products" element={<Products />} />
        <Route path="/branches" element={<Branches />} /><Route path="/faq" element={<Faq />} /><Route path="/contact" element={<Contact />} />
        <Route path="/track-inquiry" element={<TrackInquiry />} />
        <Route path="/privacy" element={<Privacy />} /><Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}><Route index element={<Dashboard />} /><Route path="branches" element={<AdminBranches />} />
          <Route path="inquiries" element={<AdminInquiries />} /><Route path="services" element={<AdminContent type="services" />} />
          <Route path="products" element={<AdminContent type="products" />} /><Route path="faqs" element={<AdminContent type="faqs" />} /></Route>
        <Route path="*" element={<h1 className="font-heading text-3xl font-bold">Page not found</h1>} />
      </Route></Routes></main>
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_.8fr_1fr_1.2fr] lg:gap-8 lg:py-14">
        <div>
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/logo-white.png" alt="" className="h-14 w-auto brightness-0 invert" />
            <span className="font-heading text-lg font-bold leading-tight">Cosmopolitan<br />Funeral Homes, Inc.</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">Serving families since 1951 with compassionate memorial services and dependable care across the Philippines.</p>
          <Link to="/about" className="footer-link mt-4 inline-flex text-sm font-semibold text-amber-300">Discover our 75-year legacy <span aria-hidden className="ml-1">→</span></Link>
        </div>

        <nav aria-label="Footer company links">
          <h2 className="font-heading text-base font-bold">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link to="/branches" className="footer-link">Nationwide branches</Link></li>
            <li><Link to="/services" className="footer-link">Funeral services</Link></li>
            <li><Link to="/products" className="footer-link">Products and packages</Link></li>
            <li><Link to="/faq" className="footer-link">Frequently asked questions</Link></li>
            <li><Link to="/about" className="footer-link">Our affiliates</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="font-heading text-base font-bold">We’re here to help</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">Reach our General Director’s mobile lines for assistance with your family’s needs.</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="tel:09178038524" className="footer-link font-semibold text-white">0917 803 8524 <span className="font-normal text-white/60">(Globe)</span></a></li>
            <li><a href="tel:09499939220" className="footer-link font-semibold text-white">0949 993 9220 <span className="font-normal text-white/60">(Smart)</span></a></li>
          </ul>
          <Link to="/contact" className="btn mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-ivory">Send an inquiry</Link>
        </div>

        <div>
          <h2 className="font-heading text-base font-bold">Stay connected</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">Find a nearby chapel, get directions, or check an inquiry you’ve already sent.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/branches" className="footer-pill">Find a branch</Link>
            <Link to="/track-inquiry" className="footer-pill">Track inquiry</Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-white/50">CVI · PCAS · CCLPI<br />Proud members of the Cosmopolitan family</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Cosmopolitan Funeral Homes, Inc. All rights reserved.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/privacy" className="footer-link">Privacy policy</Link>
          </p>
        </div>
      </div>
    </footer>
    <ChatWidget />
  </>);
}
