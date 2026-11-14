import { useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { AttributionControl, Map as MapLibreMap, NavigationControl, setWorkerUrl, type ErrorEvent } from "maplibre-gl";
import "leaflet/dist/leaflet.css";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import "mapillary-js/dist/mapillary.css";
import { IconPin } from "./Icons";

setWorkerUrl(mapWorkerUrl);

type Branch = {
  name: string;
  address?: string;
  municipality?: string;
  province?: string;
  location: { coordinates: [number, number] };
  pinAccuracy?: "mapped" | "approximate";
};

type Props = { branch: Branch; directionsUrl: string; onClose: () => void };
type StreetImage = { id: string; computed_geometry: { coordinates: [number, number] } };
type Route = { points: [number, number][]; distance: number; duration: number };
type RouteResponse = { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };

const defaultStyleUrl = "https://tiles.openfreemap.org/styles/liberty";
const styleUrl = import.meta.env.VITE_MAP_STYLE_URL || defaultStyleUrl;
const mapillaryToken = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN;

function RouteViewport({ route, origin, destination }: { route: Route | null; origin: [number, number] | null; destination: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (origin) map.fitBounds(L.latLngBounds([origin, destination]).pad(0.15), { maxZoom: 15 });
    else map.setView(destination, 15);
  }, [map, route, origin, destination]);
  return null;
}

export default function BranchMapPreview({ branch, directionsUrl, onClose }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const viewerElement = useRef<HTMLDivElement>(null);
  const requestedLocation = useRef(false);
  const map = useRef<MapLibreMap | null>(null);
  const viewer = useRef<{ remove: () => void } | null>(null);
  const [mode, setMode] = useState<"directions" | "map" | "street">("directions");
  const [route, setRoute] = useState<Route | null>(null);
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [streetLoading, setStreetLoading] = useState(false);
  const [streetMessage, setStreetMessage] = useState("");
  const [mapError, setMapError] = useState("");
  const [mapFallback, setMapFallback] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasStreetImage, setHasStreetImage] = useState(false);
  const [longitude, latitude] = branch.location.coordinates;
  const address = [branch.address, branch.municipality, branch.province].filter(Boolean).join(", ");
  const validCoordinates = Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const fallbackDirectionsUrl = origin
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin[0]},${origin[1]}%3B${latitude},${longitude}`
    : directionsUrl;

  async function getDirectionsFromCurrentLocation() {
    setMode("directions");
    setRouteError("");
    setRoute(null);
    setOrigin(null);
    if (!validCoordinates) {
      setRouteError("This branch does not have valid coordinates for routing.");
      return;
    }
    if (!navigator.geolocation) {
      setRouteError("Location is not available in this browser. You can still open OpenStreetMap directions.");
      return;
    }
    if (!window.isSecureContext) {
      setRouteError("Current location requires a secure HTTPS page. You can still open OpenStreetMap directions.");
      return;
    }

    setRouteLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      }));
      const userCoordinates: [number, number] = [position.coords.latitude, position.coords.longitude];
      setOrigin(userCoordinates);
      const coordinates = `${userCoordinates[1]},${userCoordinates[0]};${longitude},${latitude}`;
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error("The route service is temporarily unavailable. Please try again or open OpenStreetMap directions.");
      const result = await response.json() as RouteResponse;
      const bestRoute = result.routes?.[0];
      if (result.code !== "Ok" || !bestRoute?.geometry.coordinates.length) throw new Error("No driving route was found from your current location to this branch.");
      setRoute({
        points: bestRoute.geometry.coordinates.map(([routeLongitude, routeLatitude]) => [routeLatitude, routeLongitude]),
        distance: bestRoute.distance,
        duration: bestRoute.duration,
      });
      setMode("directions");
    } catch (error) {
      const locationError = error as GeolocationPositionError;
      const message = locationError.code === 1
        ? "Location permission was denied. Allow location access to show your route."
        : locationError.code === 2
          ? "Your current location could not be determined. Try again or open OpenStreetMap directions."
          : error instanceof Error ? error.message : "Could not calculate directions. Please try again.";
      setRouteError(message);
    } finally {
      setRouteLoading(false);
    }
  }

  useEffect(() => {
    setOpen(true);
    if (!requestedLocation.current) {
      requestedLocation.current = true;
      void getDirectionsFromCurrentLocation();
    }
    return () => {
      viewer.current?.remove();
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!open || mode !== "map" || !mapElement.current || map.current || !validCoordinates) return;
    setLoading(true);
    setMapError("");
    setMapFallback(false);
    try {
      const instance = new MapLibreMap({
        container: mapElement.current,
        style: styleUrl,
        center: [longitude, latitude],
        zoom: 16,
        pitch: 60,
        bearing: -15,
        attributionControl: false,
      });
      map.current = instance;
      instance.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      instance.addControl(new AttributionControl({ compact: true }), "bottom-right");
      let ready = false;
      let fallbackStarted = false;
      const showError = (message: string) => {
        setMapError(message);
        setMapFallback(true);
        setLoading(false);
      };
      const fallbackToOpenFreeMap = () => {
        if (fallbackStarted || styleUrl === defaultStyleUrl) return false;
        fallbackStarted = true;
        setMapError("");
        setLoading(true);
        try {
          instance.setStyle(defaultStyleUrl);
          return true;
        } catch {
          return false;
        }
      };
      instance.on("style.load", () => {
        ready = true;
        setMapError("");
        setLoading(false);
        if (!instance.getSource("branch-pin")) instance.addSource("branch-pin", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties: {} } });
        if (!instance.getLayer("branch-pin")) instance.addLayer({ id: "branch-pin", type: "circle", source: "branch-pin", paint: { "circle-radius": 8, "circle-color": "#bd8b42", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
        // Add terrain where available; the map remains usable if the DEM service is unavailable.
        try {
          instance.addSource("branch-terrain", { type: "raster-dem", url: "https://tiles.mapterhorn.com/tilejson.json", tileSize: 256, maxzoom: 12 });
          instance.setTerrain({ source: "branch-terrain", exaggeration: 1.25 });
        } catch { /* Terrain is optional; keep the OSM map and 3D building style. */ }
      });
      instance.on("error", (event: ErrorEvent) => {
        if (fallbackToOpenFreeMap()) return;
        if (!ready) showError(event.error?.message || "The map could not be loaded.");
      });
      instance.on("idle", () => {
        const layers = instance.getStyle().layers?.filter((layer) => layer.id !== "branch-pin" && layer.type !== "background").map((layer) => layer.id) ?? [];
        if (layers.length && instance.queryRenderedFeatures({ layers }).length) return;
        if (!fallbackToOpenFreeMap()) {
          setMapFallback(true);
          setLoading(false);
        }
      });
      const timeout = window.setTimeout(() => {
        if (!ready) {
          if (!fallbackToOpenFreeMap()) showError("The interactive map is unavailable; showing the OpenStreetMap fallback.");
        }
      }, 12000);
      return () => window.clearTimeout(timeout);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "The map could not be loaded.");
      setLoading(false);
    }
  }, [open, mode, validCoordinates, longitude, latitude]);

  useEffect(() => {
    if (!open || !map.current || mode !== "map") return;
    const timer = window.setTimeout(() => map.current?.resize(), 100);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  useEffect(() => {
    if (mapFallback) {
      map.current?.remove();
      map.current = null;
    }
  }, [mapFallback]);

  useEffect(() => {
    if (!open || mode !== "street" || !mapillaryToken || !viewerElement.current || viewer.current) return;
    let cancelled = false;
    async function showStreetImage() {
      setStreetLoading(true);
      setStreetMessage("");
      try {
        const params = new URLSearchParams({
          access_token: mapillaryToken,
          fields: "id,computed_geometry",
          bbox: [longitude - 0.01, latitude - 0.01, longitude + 0.01, latitude + 0.01].join(","),
          limit: "100",
        });
        const response = await fetch(`https://graph.mapillary.com/images?${params}`);
        if (!response.ok) throw new Error("Street imagery could not be checked.");
        const result = await response.json() as { data?: StreetImage[] };
        const nearest = (result.data ?? []).filter((image) => image.computed_geometry?.coordinates?.length === 2)
          .sort((a, b) => {
            const distance = (image: StreetImage) => Math.hypot(image.computed_geometry.coordinates[0] - longitude, image.computed_geometry.coordinates[1] - latitude);
            return distance(a) - distance(b);
          })[0];
        if (!nearest) throw new Error("No Mapillary street-level imagery is available near this branch.");
        const { Viewer } = await import("mapillary-js");
        if (cancelled || !viewerElement.current) return;
        viewer.current = new Viewer({ container: viewerElement.current, imageId: nearest.id, accessToken: mapillaryToken });
        setHasStreetImage(true);
      } catch (error) {
        if (!cancelled) {
          setHasStreetImage(false);
          setStreetMessage(error instanceof Error ? error.message : "Street-level imagery is unavailable.");
        }
      } finally {
        if (!cancelled) setStreetLoading(false);
      }
    }
    void showStreetImage();
    return () => {
      cancelled = true;
      viewer.current?.remove();
      viewer.current = null;
      setHasStreetImage(false);
    };
  }, [open, mode, longitude, latitude]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="branch-preview-title" className={`flex w-full flex-col overflow-hidden bg-white shadow-2xl transition duration-300 sm:rounded-3xl ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} h-[92dvh] sm:h-[min(760px,90dvh)] sm:max-w-5xl`}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 id="branch-preview-title" className="truncate font-heading text-lg font-bold text-navy sm:text-xl">{branch.name}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-600 sm:text-sm"><IconPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{address || "Address not published"}{branch.pinAccuracy === "approximate" && <span className="text-amber-700"> · Approximate pin</span>}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close map preview" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-navy hover:bg-slate-200">×</button>
      </header>
      <nav aria-label="Map preview options" className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-6">
        <button type="button" aria-pressed={mode === "directions"} onClick={() => setMode("directions")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "directions" ? "bg-navy text-white" : "bg-slate-100 text-navy hover:bg-slate-200"}`}>Directions</button>
        <button type="button" aria-pressed={mode === "map"} onClick={() => setMode("map")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "map" ? "bg-navy text-white" : "bg-slate-100 text-navy hover:bg-slate-200"}`}>3D map</button>
        {mapillaryToken && <button type="button" aria-pressed={mode === "street"} onClick={() => setMode("street")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "street" ? "bg-navy text-white" : "bg-slate-100 text-navy hover:bg-slate-200"}`}>Street view</button>}
        <button type="button" onClick={getDirectionsFromCurrentLocation} disabled={routeLoading} className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-navy disabled:cursor-wait disabled:opacity-70 sm:ml-auto sm:w-auto">{routeLoading ? "Finding route…" : "Use my location"}</button>
      </nav>
      <div className="relative min-h-0 flex-1 bg-slate-100">
        {mode === "directions" && validCoordinates && <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom className="absolute inset-0 h-full w-full">
          <RouteViewport route={route} origin={origin} destination={[latitude, longitude]} />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://tile.openstreetmap.de/{z}/{x}/{y}.png" />
          <CircleMarker center={[latitude, longitude]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#bd8b42", fillOpacity: 1 }}><Popup>{branch.name}</Popup></CircleMarker>
          {origin && <CircleMarker center={origin} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}><Popup>Your current location</Popup></CircleMarker>}
          {route && <Polyline positions={route.points} pathOptions={{ color: "#293bff", weight: 6, opacity: 0.85 }} />}
        </MapContainer>}
        {mode === "map" && mapFallback ? (
          <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom className="absolute inset-0 h-full w-full">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://tile.openstreetmap.de/{z}/{x}/{y}.png" />
            <CircleMarker center={[latitude, longitude]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#bd8b42", fillOpacity: 1 }}><Popup>{branch.name}</Popup></CircleMarker>
          </MapContainer>
        ) : <div ref={mapElement} className={mode === "map" ? "absolute inset-0" : "hidden"} />}
        <div ref={viewerElement} className={mode === "street" ? "absolute inset-0" : "hidden"} />
        {loading && mode === "map" && <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100/90"><p role="status" className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />Loading interactive map…</p></div>}
        {mapError && mode === "map" && mapFallback && <p role="status" className="absolute bottom-3 left-3 z-[500] rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow">3D map unavailable; showing the OpenStreetMap view.</p>}
        {mode === "directions" && routeLoading && <div className="absolute inset-0 z-[500] grid place-items-center bg-white/65"><p role="status" className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />Finding your route…</p></div>}
        {mode === "directions" && routeError && <div className="absolute left-3 right-3 top-3 z-[500] flex flex-col gap-2 rounded-xl bg-white/95 p-3 text-sm text-slate-700 shadow-lg sm:left-auto sm:max-w-md"><p role="alert">{routeError}</p><a href={fallbackDirectionsUrl} target="_blank" rel="noreferrer" className="self-start font-semibold text-brand underline">Open OSM directions</a></div>}
        {mode === "directions" && route && <div className="absolute bottom-12 left-3 right-3 z-[400] rounded-xl bg-white/95 px-4 py-3 text-sm text-navy shadow-lg sm:bottom-4 sm:left-4 sm:right-auto"><strong>Route found</strong><span className="ml-2">{route.distance >= 1000 ? `${(route.distance / 1000).toFixed(1)} km` : `${Math.round(route.distance)} m`} · {Math.max(1, Math.round(route.duration / 60))} min drive</span></div>}
        {mode === "street" && (streetLoading || (!hasStreetImage && streetMessage)) && <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100/95 p-6 text-center"><div className="max-w-sm rounded-2xl bg-white p-6 shadow-lg">{streetLoading ? <p role="status" className="flex items-center justify-center gap-3 text-sm text-slate-700"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />Checking nearby imagery…</p> : <><p role="status" className="text-sm leading-6 text-slate-700">{streetMessage}</p><button type="button" onClick={() => setMode("map")} className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Return to 3D map</button></>}</div></div>}
        {!validCoordinates && <div className="absolute inset-0 z-20 grid place-items-center p-6 text-center"><div className="rounded-2xl bg-white p-6 shadow-lg"><p role="alert" className="text-sm text-slate-700">This branch does not have valid map coordinates.</p><a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Search in OpenStreetMap</a></div></div>}
      </div>
      <footer className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500 sm:px-6">Map data © OpenStreetMap contributors · Your location is sent to OSRM only to calculate the driving route.</footer>
    </section>
  </div>;
}
