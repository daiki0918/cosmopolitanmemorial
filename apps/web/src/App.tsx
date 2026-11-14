import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Branches from "./pages/Branches";
import Contact from "./pages/Contact";
import TrackInquiry from "./pages/TrackInquiry";
import { About, CookiePolicy, Faq, Privacy, Products, Services } from "./pages/Public";
import ChatWidget from "./components/ChatWidget";
import Footer from "./components/Footer";
import { CookieConsentProvider } from "./components/CookieConsent";
import { IconPhone } from "./components/Icons";
import { AdminBranches, AdminContent, AdminInquiries, AdminLayout, Dashboard } from "./admin/Admin";
import { AdminAccount, AdminActivity, AdminUsers, RequirePerm } from "./admin/Team";
import { useLandingMotion, useSplashReady } from "./hooks/useLandingMotion";

const nav = [["/", "Home"], ["/about", "About"], ["/services", "Services"], ["/products", "Products"], ["/branches", "Branches"], ["/faq", "FAQ"], ["/contact", "Contact"]];
const Page = () => <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-14"><Outlet /></div>;

function ScrollToTop() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    // Instant, not smooth: the new page fades in, so a long smooth scroll back up would fight it.
    // ("auto" would not work here: index.css sets scroll-behavior:smooth on <html>.)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    // Move keyboard and screen-reader focus to the new page's content (not on the first load)
    if (first.current) { first.current = false; return; }
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useLandingMotion(pathname);

  // Close the mobile menu on navigation and when Escape is pressed
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (<>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-[#08112d]/95 text-white backdrop-blur-md">
      <nav aria-label="Main" className="site-nav mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 py-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/logo-white.png" alt="" className="site-logo h-11 w-auto brightness-0 invert" />
          <span className="leading-none">
            <span className="block font-heading text-lg font-semibold tracking-tight text-white sm:text-xl">Cosmopolitan</span>
            <span className="mt-1 block text-[.62rem] font-semibold uppercase tracking-[.22em] text-sand">Funeral Homes, Inc.</span>
          </span>
        </Link>
        <button type="button" className="rounded-lg border border-white/25 p-2 text-white transition hover:bg-white/10 md:hidden" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="burger h-6 w-6">
            <line className="burger-top" x1="4" y1="6" x2="20" y2="6" />
            <line className="burger-mid" x1="4" y1="12" x2="20" y2="12" />
            <line className="burger-bot" x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <ul id="menu" data-open={open} className="nav-menu absolute left-0 right-0 top-full flex flex-col gap-1 border-b border-white/10 bg-[#08112d] p-4 shadow-lg md:relative md:flex md:flex-row md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          {nav.map(([to, l], i) => (
            <li key={to} style={{ "--i": i } as CSSProperties}>
              <NavLink to={to} end onClick={() => setOpen(false)} className={({ isActive }) => `site-nav-link block rounded-full px-3 py-2 text-sm font-medium transition lg:px-4 ${isActive ? "text-sand" : "text-white/75 hover:text-white"}`}>{l}</NavLink>
            </li>
          ))}
          <li className="md:hidden" style={{ "--i": nav.length } as CSSProperties}>
            <a href="tel:09178038524" className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white"><IconPhone className="h-4 w-4" /> Call 0917 803 8524</a>
          </li>
        </ul>
        <a href="tel:09178038524" className="hidden items-center gap-3 rounded-full border border-white/20 py-1.5 pl-1.5 pr-4 text-left transition hover:border-white/40 hover:bg-white/10 xl:inline-flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><IconPhone className="h-4 w-4" /></span>
          <span className="text-xs leading-tight"><span className="block text-white/60">Call us</span><span className="block font-semibold">0917 803 8524</span></span>
        </a>
      </nav>
    </header>

    <main id="main" tabIndex={-1} className="site-main"><div key={pathname} className="route-enter"><Outlet /></div></main>

    <Footer />
    <ChatWidget />
  </>);
}

export default function App() {
  useSplashReady();
  return (<>
    <div id="app-content">
    <ScrollToTop />
    <Routes>
      {/* Public site: navbar + footer + chat widget */}
      <Route element={<CookieConsentProvider><PublicLayout /></CookieConsentProvider>}>
        <Route path="/" element={<Home />} />
        <Route element={<Page />}>
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/products" element={<Products />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/track-inquiry" element={<TrackInquiry />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="*" element={<h1 className="font-heading text-3xl font-bold">Page not found</h1>} />
        </Route>
      </Route>

      {/* Admin: separate layout, no public navbar/footer */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="branches" element={<RequirePerm perm="branches.view"><AdminBranches /></RequirePerm>} />
        <Route path="inquiries" element={<RequirePerm perm="inquiries.view"><AdminInquiries /></RequirePerm>} />
        <Route path="services" element={<RequirePerm perm="content.edit"><AdminContent type="services" /></RequirePerm>} />
        <Route path="products" element={<RequirePerm perm="content.edit"><AdminContent type="products" /></RequirePerm>} />
        <Route path="faqs" element={<RequirePerm perm="content.edit"><AdminContent type="faqs" /></RequirePerm>} />
        <Route path="users" element={<RequirePerm perm="users.manage"><AdminUsers /></RequirePerm>} />
        <Route path="activity" element={<RequirePerm perm="audit.view"><AdminActivity /></RequirePerm>} />
        <Route path="account" element={<AdminAccount />} />
      </Route>
    </Routes>
    </div>

  </>);
}
