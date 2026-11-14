import { useEffect, useLayoutEffect } from "react";

const READY = "splash-ready";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Starts the fallback splash exit once the app has mounted. Landing animations
 * wait for this class, so they play as the curtains open.
 * Call once, in <App />.
 */
export function useSplashReady() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains(READY)) return;
    const splash = document.querySelector<HTMLElement>(".splash-fallback");
    if (!splash) { root.classList.add(READY); return; }

    const exitDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1500;
    window.setTimeout(() => {
      root.classList.add(READY);
      splash.classList.add("is-exiting");
      window.setTimeout(() => splash.remove(), 700);
    }, exitDelay);
  }, []);
}

/** Tags the hero text column: every sibling of the <h1> becomes a staggered .hero-item. */
function tagHero(main: HTMLElement) {
  const h1 = main.querySelector<HTMLElement>("h1");
  const section = h1?.closest("section");
  if (!h1 || !section || section.dataset.motion) return;
  section.dataset.motion = "1";
  Array.from(h1.parentElement?.children ?? []).forEach((el, i) => {
    el.classList.add("hero-item");
    (el as HTMLElement).style.setProperty("--hi", String(i));
  });
  section.querySelector("img.absolute, video")?.classList.add("hero-bg");
}

/** Scroll reveal: below-the-fold blocks on the landing page (and anything with data-reveal) rise in. */
function attachReveal(main: HTMLElement, io: IntersectionObserver, landing: boolean) {
  const targets = new Set<HTMLElement>(main.querySelectorAll<HTMLElement>("[data-reveal]"));
  if (landing) main.querySelectorAll<HTMLElement>("section:not(:first-of-type) > *").forEach((el) => targets.add(el));

  targets.forEach((el) => {
    if (el.classList.contains("reveal")) return;
    const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
    el.style.setProperty("--rd", `${Math.min(siblings.indexOf(el), 5) * 90}ms`);
    el.classList.add("reveal");
    io.observe(el);
  });
}

/** Call inside the public layout with the current pathname. */
export function useLandingMotion(pathname: string) {
  // Layout effect: tag the hero before the first paint so it never flashes un-animated.
  useLayoutEffect(() => {
    if (reduced() || pathname !== "/") return;
    const main = document.getElementById("main");
    if (main) tagHero(main);
  }, [pathname]);

  useEffect(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    const main = document.getElementById("main");
    if (!main) return;
    const landing = pathname === "/";

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    const scan = () => { if (landing) tagHero(main); attachReveal(main, io, landing); };
    scan();

    // Pick up content that renders later (e.g. after an API fetch)
    let raf = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); });
    mo.observe(main, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); };
  }, [pathname]);
}
