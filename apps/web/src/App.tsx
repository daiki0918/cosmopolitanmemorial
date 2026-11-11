import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Branches from "./pages/Branches";
import Contact from "./pages/Contact";
import TrackInquiry from "./pages/TrackInquiry";
import { About, Faq, Privacy, Products, Services } from "./pages/Public";
import ChatWidget from "./components/ChatWidget";
import { IconPhone } from "./components/Icons";
import { AdminBranches, AdminContent, AdminInquiries, AdminLayout, Dashboard } from "./admin/Admin";
import { AdminAccount, AdminActivity, AdminUsers, RequirePerm } from "./admin/Team";

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

  // Close the mobile menu on navigation and when Escape is pressed
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const menuRef = useRef<HTMLUListElement>(null);

  // Sliding pill: glides to the hovered/focused link, and settles back on the current page's link
  const placePill = useCallback((target?: HTMLElement | null) => {
    const menu = menuRef.current;
    if (!menu) return;
    const activeItem = menu.querySelector<HTMLElement>('a[aria-current="page"]')?.closest("li") ?? null;
    const item = target ? target.closest("li") : activeItem;
    if (!item) { menu.dataset.pill = "none"; return; }
    menu.style.setProperty("--pill-x", `${item.offsetLeft}px`);
    menu.style.setProperty("--pill-w", `${item.offsetWidth}px`);
    menu.dataset.pill = item === activeItem ? "active" : "hover";
  }, []);

  useEffect(() => { placePill(); }, [pathname, placePill]);
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const resize = new ResizeObserver(() => placePill());
    resize.observe(menu);
    document.fonts?.ready.then(() => placePill());
    // Enable the glide only after the first placement, so the pill doesn't fly in from the corner
    const frame = requestAnimationFrame(() => { menu.dataset.ready = "true"; });
    return () => { resize.disconnect(); cancelAnimationFrame(frame); };
  }, [placePill]);

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
        <ul ref={menuRef} id="menu" data-open={open} onMouseLeave={() => placePill()} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) placePill(); }} className="nav-menu absolute left-0 right-0 top-full flex flex-col gap-1 border-b border-white/10 bg-[#08112d] p-4 shadow-lg md:relative md:flex md:flex-row md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <span aria-hidden className="nav-pill" />
          {nav.map(([to, l], i) => (
            <li key={to} style={{ "--i": i } as CSSProperties} onMouseEnter={(e) => placePill(e.currentTarget)} onFocus={(e) => placePill(e.currentTarget)}>
              <NavLink to={to} end onClick={() => setOpen(false)} className={({ isActive }) => `site-nav-link block rounded-full px-3 py-2 text-sm font-medium transition lg:px-4 ${isActive ? "text-white" : "text-white/75 hover:text-white"}`}>{l}</NavLink>
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

    <footer className="site-footer text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_.8fr_1fr_1.2fr] lg:gap-10 lg:py-16">
        <div className="footer-col" style={{ "--i": 0 } as CSSProperties}>
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/logo-white.png" alt="" className="h-14 w-auto brightness-0 invert" />
            <span className="leading-none">
              <span className="block font-heading text-xl font-semibold tracking-tight">Cosmopolitan</span>
              <span className="mt-1 block text-[.62rem] font-semibold uppercase tracking-[.22em] text-sand">Funeral Homes, Inc.</span>
            </span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/70">Serving families since 1951 with compassionate memorial services and dependable care across the Philippines.</p>
          <Link to="/about" className="footer-link btn-arrow mt-5 inline-flex items-center text-sm font-semibold text-sand">Discover our 75-year legacy <span aria-hidden className="arrow ml-2">→</span></Link>
        </div>

        <nav aria-label="Footer company links" className="footer-col" style={{ "--i": 1 } as CSSProperties}>
          <h2 className="footer-heading font-heading text-base font-semibold">Explore</h2>
          <ul className="mt-5 space-y-3 text-sm text-white/70">
            <li><Link to="/branches" className="footer-link">Nationwide branches</Link></li>
            <li><Link to="/services" className="footer-link">Funeral services</Link></li>
            <li><Link to="/products" className="footer-link">Products and packages</Link></li>
            <li><Link to="/faq" className="footer-link">Frequently asked questions</Link></li>
            <li><Link to="/about" className="footer-link">Our affiliates</Link></li>
          </ul>
        </nav>

        <div className="footer-col" style={{ "--i": 2 } as CSSProperties}>
          <h2 className="footer-heading font-heading text-base font-semibold">We’re here to help</h2>
          <p className="mt-5 text-sm leading-6 text-white/70">Reach our General Director’s mobile lines for assistance with your family’s needs.</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li><a href="tel:09178038524" className="footer-link inline-flex items-center gap-2.5 font-semibold text-white"><IconPhone className="h-4 w-4 text-sand" />0917 803 8524 <span className="font-normal text-white/70">(Globe)</span></a></li>
            <li><a href="tel:09499939220" className="footer-link inline-flex items-center gap-2.5 font-semibold text-white"><IconPhone className="h-4 w-4 text-sand" />0949 993 9220 <span className="font-normal text-white/70">(Smart)</span></a></li>
          </ul>
          <Link to="/contact" className="btn mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-ivory">Send an inquiry</Link>
        </div>

        <div className="footer-col" style={{ "--i": 3 } as CSSProperties}>
          <h2 className="footer-heading font-heading text-base font-semibold">Stay connected</h2>
          <p className="mt-5 text-sm leading-6 text-white/70">Find a nearby chapel, get directions, or check an inquiry you’ve already sent.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/branches" className="footer-pill">Find a branch</Link>
            <Link to="/track-inquiry" className="footer-pill">Track inquiry</Link>
          </div>
          <p className="mt-6 text-xs leading-5 text-white/65">CVI · PCAS · CCLPI<br />Proud members of the Cosmopolitan family</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Cosmopolitan Funeral Homes, Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/privacy" className="footer-link">Privacy policy</Link>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} className="back-top inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 font-semibold text-white/80 hover:border-white/45 hover:text-white">
              Back to top <span aria-hidden className="arrow">↑</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
    <ChatWidget />
  </>);
}

export default function App() {
  return (<>
    <ScrollToTop />
    <Routes>
      {/* Public site: navbar + footer + chat widget */}
      <Route element={<PublicLayout />}>
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
  </>);
}