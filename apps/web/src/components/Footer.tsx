import { Link } from "react-router-dom";
import { IconPhone } from "./Icons";
import { useCookieConsent } from "./CookieConsent";

const nav = [["/", "Home"], ["/about", "About"], ["/services", "Services"], ["/products", "Products"], ["/branches", "Branches"], ["/faq", "FAQ"], ["/contact", "Contact"]];
const phones = [
  { label: "Globe", display: "0917 803 8524", tel: "09178038524" },
  { label: "Smart", display: "0949 993 9220", tel: "09499939220" },
];
// `solid: true` = the logo has an opaque body (a badge or plate), so a flat white silhouette would turn it into a block.
const partners: { name: string; src: string; href?: string; solid?: boolean }[] = [
  { name: "Angelica Life Plan", src: "/Angelica-life-plan.png" },
  { name: "CCLPI", src: "/cclpi-logo-transparent.png" },
  { name: "CVI", src: "/cvi-logo-transparent.png", solid: true },
  { name: "Pacific Center for Advanced Studies", src: "/pcas-logo-transparent.png" },
];

// Shared class strings: one source of truth for repeated utilities
const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const textLink = `rounded-sm text-white/70 transition-colors hover:text-white ${ring}`;
const heading = "font-heading text-base font-semibold text-white after:mt-3 after:block after:h-px after:w-7 after:bg-sand after:content-['']";
const glass = "border border-white/15 bg-white/[.06] backdrop-blur-md";
const lift = "transition duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
// Desktop partner logos: flat white mark, or (for logos with a solid body) a bright grayscale that keeps the detail.
const markWhite = "opacity-80 brightness-0 invert group-hover:opacity-100 group-hover:brightness-100 group-hover:invert-0 group-focus-visible:opacity-100 group-focus-visible:brightness-100 group-focus-visible:invert-0";
const markGray = "opacity-90 grayscale brightness-125 group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-100 group-focus-visible:opacity-100 group-focus-visible:grayscale-0 group-focus-visible:brightness-100";

// Touch-device partner strip: slow endless marquee. Pauses while pressed; static and centered with reduced motion.
const marqueeCss = `
  @keyframes footer-marquee{to{transform:translateX(-50%)}}
  .footer-marquee-track{animation:footer-marquee 26s linear infinite}
  .footer-marquee:active .footer-marquee-track{animation-play-state:paused}
  @media (prefers-reduced-motion:reduce){
    .footer-marquee-track{animation:none;width:auto!important;flex-wrap:wrap;justify-content:center}
    .footer-marquee-track>ul[aria-hidden="true"]{display:none}
  }
`;
const fade = "[mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]";

export default function Footer() {
  const { openSettings } = useCookieConsent();

  const backToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });

  return (
    <footer className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#0A1A52_0%,#122870_55%,#0A1A52_100%)] text-white">
      {/* sand hairline, echoing the header */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(214,189,139,.6)_30%,rgba(214,189,139,.6)_70%,transparent)]" />
      {/* brand-blue glow */}
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-48 -z-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(69,89,255,.28),transparent_68%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 -z-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(214,189,139,.10),transparent_68%)]" />

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-16">
        {/* Main columns */}
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_1.1fr_1fr]">
          <section aria-labelledby="footer-brand">
            <Link to="/" className={`inline-flex items-center gap-3 rounded-sm ${ring}`}>
              <img src="/logo-white.png" alt="" className="h-14 w-auto brightness-0 invert" />
              <span className="leading-none">
                <span id="footer-brand" className="block font-heading text-xl font-semibold tracking-tight">Cosmopolitan</span>
                <span className="mt-1 block text-[.62rem] font-semibold uppercase tracking-[.22em] text-sand">Funeral Homes, Inc.</span>
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/70">
              Serving families since 1951 with compassionate memorial services and dependable care across the Philippines.
            </p>
            <Link to="/about" className={`group mt-6 inline-flex items-center gap-3 rounded-sm text-sm font-semibold text-white/75 transition-colors hover:text-white ${ring}`}>
              <span className="font-heading text-lg leading-none">1951</span>
              <span aria-hidden className="h-4 w-px bg-white/25" />
              <span className="inline-flex items-baseline gap-1">Our <span className="font-heading text-base font-bold leading-none text-sand">75 years</span> legacy</span>
              <span aria-hidden className="text-sand transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </Link>
          </section>

          <nav aria-label="Footer navigation">
            <h2 className={heading}>Explore</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {nav.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className={`group inline-flex items-center ${textLink}`}>
                    <span aria-hidden className="h-px w-0 bg-sand transition-all duration-300 group-hover:mr-2 group-hover:w-3 motion-reduce:transition-none" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className={heading}>Speak with our team</h2>
            <p className="mt-5 text-sm leading-6 text-white/70">Reach our General Director’s mobile lines for assistance with your family’s needs.</p>
            <ul className="mt-5 space-y-3">
              {phones.map(({ label, display, tel }) => (
                <li key={tel}>
                  <a href={`tel:${tel}`} className={`group flex min-h-14 items-center gap-3 rounded-full p-2 pr-5 hover:border-sand/60 hover:bg-white/10 hover:shadow-lg hover:shadow-black/30 ${glass} ${lift} ${ring}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition-colors duration-300 group-hover:border-transparent group-hover:bg-[#2f3dff] motion-reduce:transition-none">
                      <IconPhone className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col leading-tight">
                      <span className="text-[.65rem] font-semibold uppercase tracking-[.16em] text-white/60">{label}</span>
                      <span className="text-[.95rem] font-semibold tabular-nums">{display}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="footer-connected">
            <h2 id="footer-connected" className={heading}>Stay connected</h2>
            <p className="mt-5 text-sm leading-6 text-white/70">Find a nearby chapel, get directions, or check an inquiry you’ve already sent.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[["/branches", "Find a branch"], ["/track-inquiry", "Track inquiry"]].map(([to, label]) => (
                <Link key={to} to={to} className={`rounded-full px-4 py-2 text-[.8rem] font-semibold text-white hover:border-white hover:bg-white hover:text-navy ${glass} ${lift} ${ring}`}>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Partners */}
        <section aria-labelledby="footer-partners" className="mt-14 border-t border-white/10 pt-10">
          <h2 id="footer-partners" className="text-center text-[.68rem] font-semibold uppercase tracking-[.26em] text-white/60">Our Partners &amp; Affiliates</h2>

          {/* Mouse devices: transparent logo wall. Logos rest as clean white marks; on hover or focus a white tile rises and the logo shows its real colors. */}
          <ul className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-y-2 sm:grid-cols-4 [@media(hover:none)]:hidden">
            {partners.map(({ name, src, href, solid }) => {
              const logo = (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-3 inset-y-2 scale-95 rounded-2xl bg-white opacity-0 shadow-xl shadow-black/30 transition duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                  />
                  <img
                    src={src}
                    alt={name}
                    loading="lazy"
                    className={`relative max-h-10 max-w-[72%] object-contain transition duration-300 motion-reduce:transition-none sm:max-h-12 ${solid ? markGray : markWhite}`}
                  />
                </>
              );
              const cell = "group relative flex h-24 items-center justify-center px-4";
              return (
                <li key={name} className="relative sm:before:absolute sm:before:left-0 sm:before:top-1/2 sm:before:h-10 sm:before:w-px sm:before:-translate-y-1/2 sm:before:bg-white/15 sm:first:before:hidden">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`} className={`${cell} ${ring}`}>{logo}</a>
                  ) : (
                    <div className={cell}>{logo}</div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Touch devices: a full-width ivory band with the logos in full color, gliding slowly past. */}
          <div className="footer-marquee -mx-5 mt-8 hidden border-y border-sand/30 bg-[#FAF8F5] py-5 sm:-mx-8 [@media(hover:none)]:block">
            <style>{marqueeCss}</style>
            <div className={`overflow-hidden ${fade}`}>
              <div className="footer-marquee-track flex w-max">
                {[0, 1].map((copy) => (
                  <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                    {partners.map(({ name, src, href }) => {
                      const img = <img src={src} alt={copy === 0 ? name : ""} className="max-h-9 w-auto max-w-[9rem] object-contain" />;
                      return (
                        <li key={name} className="mx-8 flex h-14 items-center">
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`} tabIndex={copy === 1 ? -1 : undefined}>{img}</a>
                          ) : (
                            img
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Cosmopolitan Funeral Homes, Inc. All rights reserved.</p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li><Link to="/privacy" className={textLink}>Privacy policy</Link></li>
            <li><Link to="/cookies" className={textLink}>Cookie policy</Link></li>
            <li><button type="button" onClick={openSettings} className={textLink}>Cookie Settings</button></li>
            <li>
              <button type="button" onClick={backToTop} className={`group inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 font-semibold text-white/80 hover:border-white/45 hover:bg-white/10 hover:text-white ${ring}`}>
                Back to top
                <span aria-hidden className="transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">↑</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}