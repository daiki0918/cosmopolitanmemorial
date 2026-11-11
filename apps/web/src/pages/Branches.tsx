import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import Reveal from "../components/Reveal";
import Skeleton from "../components/Skeleton";
import { IconClock, IconPhone, IconPin } from "../components/Icons";

type Branch = {
  _id: string;
  name: string;
  address?: string;
  municipality?: string;
  province?: string;
  phone?: string;
  hours?: string;
  image?: string;
  location: { coordinates: [number, number] };
  pinAccuracy?: "mapped" | "approximate";
};
type Region = "Luzon" | "Visayas" | "Mindanao";
const regions = ["All", "Luzon", "Visayas", "Mindanao"] as const;
type RegionFilter = (typeof regions)[number];

const mapPin = (active: boolean) => L.divIcon({
  className: "cosmo-map-pin",
  html: `<span class="${active ? "is-active" : ""}"></span>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30],
});

const branchPhotos: [string, string][] = [
  ["araneta", "/branches/Araneta.jfif"],
  ["valencia", "/branches/Valencia.jfif"],
  ["tagum", "/branches/Tagum.jfif"],
  ["quezon", "/branches/Quezon.jfif"],
  ["pasig", "/branches/Pasig.jfif"],
  ["maracas", "/branches/Maracas.png"],
  ["davao", "/branches/Davao.jfif"],
  ["mandaue", "/branches/Mandaue.jfif"],
  ["danao", "/branches/Danao.jfif"],
  ["liloan", "/branches/Liloan.jfif"],
  ["lapu-lapu", "/branches/Lapu-Lapu.png"],
  ["cordova", "/branches/cordova.jfif"],
  ["junquera", "/branches/junquera.jpg"],
  ["carcar", "/branches/Carcar.jfif"],
  ["iligan", "/branches/Iligan.jfif"],
  ["cagayan", "/branches/Cagayan.jfif"],
  ["general santos", "/branches/General_Santos.jfif"],
  ["cabaguio", "/branches/Cabaguio.jfif"],
  ["bogo", "/branches/Bogo.jfif"],
  ["baguio", "/branches/Baguio.jfif"],
  ["argao", "/branches/Argao.jfif"],
];

function photoLabel(place: string) {
  return place
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function regionFor(branch: Branch): Region {
  const [longitude, latitude] = branch.location.coordinates;
  if (latitude > 13.5) return "Luzon";
  if (longitude < 124.5 && latitude > 8.5) return "Visayas";
  return "Mindanao";
}

function photoFor(branch: Branch) {
  if (branch.image) return branch.image;
  const search = `${branch.name} ${branch.municipality ?? ""} ${branch.province ?? ""}`.toLowerCase();
  return branchPhotos.find(([place]) => search.includes(place))?.[1];
}

function mapLinks(branch: Branch) {
  const [longitude, latitude] = branch.location.coordinates;
  const search = encodeURIComponent([branch.name, branch.address, branch.municipality, branch.province].filter(Boolean).join(", "));
  return {
    directions: `https://www.openstreetmap.org/directions?to=${latitude}%2C${longitude}`,
    search: `https://www.openstreetmap.org/search?query=${search}`,
  };
}

function phoneLinks(phone?: string) {
  return (phone?.match(/\+?\d[\d\s()-]*\d/g) ?? []).map((value) => {
    const number = value.trim();
    return { number, href: `tel:${number.replace(/[^\d+]/g, "")}` };
  });
}

function MapFocus({ branch, enabled }: { branch?: Branch; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !branch) return;
    const [longitude, latitude] = branch.location.coordinates;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) map.setView([latitude, longitude], 13);
    else map.flyTo([latitude, longitude], 13, { duration: 1.2, easeLinearity: 0.25 });
  }, [branch, enabled, map]);
  return null;
}

export default function Branches() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<RegionFilter>("All");
  const [selectedId, setSelectedId] = useState("");
  const [focusSelected, setFocusSelected] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["branches"], queryFn: () => api<Branch[]>("/public/branches") });
  const branches = data ?? [];
  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return branches.filter((branch) => {
      if (region !== "All" && regionFor(branch) !== region) return false;
      return !search || [branch.name, branch.address, branch.municipality, branch.province, branch.phone, regionFor(branch)]
        .some((value) => value?.toLowerCase().includes(search));
    });
  }, [branches, q, region]);

  useEffect(() => {
    if (!filtered.some((branch) => branch._id === selectedId)) setSelectedId(filtered[0]?._id ?? "");
  }, [filtered, selectedId]);

  const selected = filtered.find((branch) => branch._id === selectedId) ?? filtered[0];
  const maps = selected ? mapLinks(selected) : null;
  const selectedPhoneLinks = phoneLinks(selected?.phone);

  function selectBranch(id: string) {
    setSelectedId(id);
    setFocusSelected(true);
  }

  return (
    <section className="space-y-6 pb-8">
      <Reveal className="branch-hero relative overflow-hidden rounded-[2rem] bg-navy px-6 py-8 text-white shadow-xl shadow-navy/15 sm:px-10 sm:py-11 lg:px-12 lg:py-12">
        <span aria-hidden className="branch-hero-glow branch-hero-glow-one" />
        <span aria-hidden className="branch-hero-glow branch-hero-glow-two" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-amber-300">Find us near you · Nationwide care</p>
            <h1 className="mt-3 font-heading text-4xl font-bold leading-tight sm:text-5xl">Our branches</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">Explore Cosmopolitan locations across Luzon, Visayas, and Mindanao. Select any pin for contact details and directions.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur sm:self-auto">
            <IconPin className="h-6 w-6 text-amber-300" />
            <div><p className="font-heading text-2xl font-bold">{isLoading ? "…" : filtered.length}</p><p className="text-xs text-white/70">locations listed</p></div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[minmax(19rem,.72fr)_minmax(0,1.8fr)] lg:items-stretch">
        <section aria-label="Branch locations" className="order-2 overflow-hidden rounded-3xl border border-brand/10 bg-white shadow-sm lg:order-1 lg:flex lg:h-[38rem] lg:flex-col">
          <label className="block border-b border-slate-100 p-4">
            <span className="block text-sm font-medium text-navy">Search branches</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, city or province" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
          </label>

          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3" aria-label="Filter branches by region">
            {regions.map((item) => <button key={item} type="button" aria-pressed={region === item} onClick={() => setRegion(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${region === item ? "bg-navy text-white shadow-sm" : "bg-ivory text-navy hover:bg-brand/10"}`}>{item === "All" ? "All regions" : item}</button>)}
          </div>

          {isLoading && <div className="p-4"><Skeleton rows={3} /></div>}
          {error && <p role="alert" className="px-5 pb-2 text-xs text-red-700">Could not load branch locations. Please try again later.</p>}
          <p className="px-4 pb-2 text-xs leading-5 text-slate-500">Area pins are approximate unless marked as a mapped address.</p>
          {!isLoading && filtered.length === 0 && <p className="p-5 text-sm text-slate-600">No locations match that search.</p>}

          <ul className="max-h-[38vh] space-y-3 overflow-y-auto p-3 sm:max-h-[38vh] lg:min-h-0 lg:max-h-none lg:flex-1">
            {filtered.map((branch, index) => {
              const active = branch._id === selected?._id;
              const image = photoFor(branch);
              return (
                <li key={branch._id} className="branch-location-item" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
                  <button type="button" aria-pressed={active} onClick={() => selectBranch(branch._id)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-brand bg-brand/[.04] shadow-sm" : "border-slate-200 hover:border-brand/40 hover:bg-ivory"}`}>
                    {image
                      ? <img src={image} alt="" loading={index > 2 ? "lazy" : "eager"} className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      : <span aria-hidden className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"><IconPin className="h-7 w-7" /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading text-base font-bold text-navy">{branch.name}</span>
                      <span className="mt-0.5 block text-[.68rem] font-semibold uppercase tracking-wide text-brand">{regionFor(branch)}</span>
                      <span className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-600">
                        <IconPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{[branch.address, branch.municipality, branch.province].filter(Boolean).join(", ") || "Address not published"}</span>
                      </span>
                      {branch.pinAccuracy === "approximate" && <span className="mt-1 block text-[.7rem] font-medium text-amber-700">Approximate area pin</span>}
                      {branch.phone && <span className="mt-1 block truncate text-xs text-slate-500">{branch.phone}</span>}
                    </span>
                    <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${active ? "bg-brand" : "bg-slate-200"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div role="region" aria-label="Map of branch locations" className="order-1 space-y-3 lg:order-2">
          <section className="branch-map-shell relative isolate z-0 h-[24rem] overflow-hidden rounded-3xl border border-brand/10 bg-slate-100 shadow-sm sm:h-[30rem] lg:h-[38rem]">
            <MapContainer center={[12.2, 122.4]} zoom={5} scrollWheelZoom={false} className="absolute inset-0 h-full w-full">
              <MapFocus branch={selected} enabled={focusSelected} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
              />
              {filtered.map((branch) => {
                const [longitude, latitude] = branch.location.coordinates;
                return (
                  <Marker
                    key={branch._id}
                    position={[latitude, longitude]}
                    icon={mapPin(branch._id === selected?._id)}
                    eventHandlers={{ click: () => selectBranch(branch._id) }}
                  >
                    <Popup>
                      <strong>{branch.name}</strong>
                      <br />
                      {[branch.address, branch.municipality, branch.province].filter(Boolean).join(", ")}
                      {branch.pinAccuracy === "approximate" && <><br /><span>Approximate area pin</span></>}
                      {branch.phone && <><br />{phoneLinks(branch.phone).map(({ number, href }, index) => <span key={href}>{index > 0 && " / "}<a href={href}>{number}</a></span>)}</>}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            {selected && maps ? <>
              <a href={maps.search} target="_blank" rel="noreferrer" className="absolute right-4 top-4 z-[400] rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-semibold text-navy shadow-md backdrop-blur transition hover:bg-white">Open map ↗</a>
              <Reveal key={`detail-${selected._id}`} className="absolute inset-x-3 bottom-3 z-[400] hidden rounded-2xl border border-white/70 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-6 lg:block">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {photoFor(selected) && <img src={photoFor(selected)} alt="" className="hidden h-20 w-24 shrink-0 rounded-xl object-cover sm:block" />}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-xl font-bold text-navy">{selected.name}</h2>
                    <p className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-600"><IconPin className="mt-1 h-4 w-4 shrink-0 text-brand" />{[selected.address, selected.municipality, selected.province].filter(Boolean).join(", ") || "Address not published"}</p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                      {selectedPhoneLinks.length > 0 && <span className="inline-flex flex-wrap items-center gap-2"><IconPhone className="h-4 w-4 text-brand" />{selectedPhoneLinks.map(({ number, href }, index) => <span key={href}>{index > 0 && <span className="text-slate-400"> / </span>}<a href={href} className="font-medium text-brand hover:underline">{number}</a></span>)}</span>}
                      {selected.hours && <span className="inline-flex items-center gap-2"><IconClock className="h-4 w-4 text-brand" />{selected.hours}</span>}
                      {!selected.phone && !selected.hours && <span>Call or message us for current hours and contact details.</span>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a href={maps.directions} target="_blank" rel="noreferrer" className="btn inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy">Get directions</a>
                      {selectedPhoneLinks.length === 1 && <a href={selectedPhoneLinks[0].href} className="btn inline-flex items-center justify-center rounded-full border border-brand/20 px-5 py-2.5 text-sm font-semibold text-navy hover:bg-brand/5">Call branch</a>}
                    </div>
                  </div>
                </div>
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">{selected.pinAccuracy === "approximate" ? "This is an approximate city or neighborhood pin, not a confirmed branch address. Please confirm the exact location before travelling." : "Pin location shown on OpenStreetMap. Confirm branch details before travelling."}</p>
              </Reveal>
            </> : <div className="absolute inset-x-3 bottom-3 z-[400] rounded-2xl bg-white/95 p-5 text-center shadow-lg sm:inset-x-5 sm:bottom-5">
              <p className="text-sm text-slate-600">{isLoading ? "Loading branch locations…" : "No locations match this search."}</p>
            </div>}
          </section>
          {selected && maps && <Reveal key={`mobile-detail-${selected._id}`} className="rounded-2xl border border-brand/10 bg-white p-4 shadow-sm lg:hidden">
            <h2 className="font-heading text-lg font-bold text-navy">{selected.name}</h2>
            <p className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-600"><IconPin className="mt-1 h-4 w-4 shrink-0 text-brand" />{[selected.address, selected.municipality, selected.province].filter(Boolean).join(", ") || "Address not published"}</p>
            {selected.pinAccuracy === "approximate" && <p className="mt-2 text-xs leading-5 text-amber-800">Approximate area pin — please confirm the exact address before travelling.</p>}
            {selectedPhoneLinks.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">{selectedPhoneLinks.map(({ number, href }, index) => <span key={href}>{index > 0 && <span className="text-slate-400"> / </span>}<a href={href} className="font-medium text-brand hover:underline">{number}</a></span>)}</p>}
            <a href={maps.directions} target="_blank" rel="noreferrer" className="btn mt-3 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy">Get directions</a>
          </Reveal>}
        </div>
      </div>

      <Reveal className="rounded-2xl border border-brand/10 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">General Director mobile</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">For assistance across locations, call or message the general hotline.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 font-semibold sm:mt-0">
          <a href="tel:09178038524" className="rounded-full bg-ivory px-4 py-2 text-sm text-navy hover:bg-brand/10">0917 803 8524 <span className="font-normal text-slate-500">(Globe)</span></a>
          <a href="tel:09499939220" className="rounded-full bg-ivory px-4 py-2 text-sm text-navy hover:bg-brand/10">0949 993 9220 <span className="font-normal text-slate-500">(Smart)</span></a>
        </div>
      </Reveal>

      <Reveal className="pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-brand">From our locations</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-navy sm:text-3xl">Branch photo gallery</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore photos of Cosmopolitan locations around the country. Open the map pins above for addresses, contact details, and directions.</p>
          </div>
          <span className="text-sm text-slate-500">{branchPhotos.length} photos</span>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {branchPhotos.map(([place, src], index) => (
            <Reveal as="li" delay={(index % 4) * 55} key={src} className="card-hover overflow-hidden rounded-2xl border border-brand/10 bg-white shadow-sm">
              <div className="img-zoom aspect-[4/3] bg-slate-100">
                <img src={src} alt={`${photoLabel(place)} branch`} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="px-4 py-3">
                <h3 className="font-heading text-sm font-bold text-navy sm:text-base">{photoLabel(place)}</h3>
                <p className="mt-1 text-xs text-slate-500">Branch photo</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
