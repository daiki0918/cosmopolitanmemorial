// Minimal inline icon set — no external assets, inherits currentColor.
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
export const IconHeart = (p: { className?: string }) => <svg {...base} {...p}><path d="M12 20s-7-4.4-9.3-8.8C1 8 2.4 5 5.6 5c1.9 0 3.3 1 4.4 2.6C11.1 6 12.5 5 14.4 5 17.6 5 19 8 18.3 11.2 16 15.6 12 20 12 20Z"/></svg>;
export const IconPin = (p: { className?: string }) => <svg {...base} {...p}><path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>;
export const IconClock = (p: { className?: string }) => <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>;
export const IconShield = (p: { className?: string }) => <svg {...base} {...p}><path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z"/></svg>;
export const IconPhone = (p: { className?: string }) => <svg {...base} {...p}><path d="M5 4h3l2 5-2 2a11 11 0 0 0 5 5l2-2 5 2v3a2 2 0 0 1-2 2C11 21 3 13 3 6a2 2 0 0 1 2-2Z"/></svg>;
export const IconFlower = (p: { className?: string }) => <svg {...base} {...p}><circle cx="12" cy="12" r="2.3"/><path d="M12 9.5C10 7 10 4 12 2c2 2 2 5 0 7.5Zm0 5C14 17 14 20 12 22c-2-2-2-5 0-7.5ZM9.5 12C7 10 4 10 2 12c2 2 5 2 7.5 0Zm5 0c2.5 2 5.5 2 7.5 0-2-2-5-2-7.5 0Z"/></svg>;
