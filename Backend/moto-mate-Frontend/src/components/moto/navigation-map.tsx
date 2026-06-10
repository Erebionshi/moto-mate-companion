// Client-only — loaded lazily by NavigationView (never runs during SSR).
// Google Maps-style driving camera: tilted pitch, heading-up bearing,
// street-level zoom, user puck pinned to the lower third of the screen.
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";

const CARTO_GL_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const MANILA: [number, number] = [120.9842, 14.5995]; // [lng, lat]

const NAV_PITCH = 60;
const NAV_ZOOM = 17.5;
const EASE_MS = 800;

type DestType = { lat: number; lng: number; name?: string } | null;

type Props = {
  /** [lat, lng] — same order the rest of the app uses */
  userLocation: [number, number] | null;
  destination?: DestType;
  routeGeometry?: [number, number][];
  /** Compass/GPS heading 0–360° (0 = North) */
  heading?: number | null;
  /** Reports the live map bearing so the parent compass stays in sync */
  onBearingChange?: (bearing: number) => void;
};

function toLngLat([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

function routeToGeoJSON(geometry?: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: (geometry ?? []).map(toLngLat),
    },
  };
}

// Bearing in degrees from point a to point b ([lat, lng])
function bearingBetween(a: [number, number], b: [number, number]): number {
  const f1 = (a[0] * Math.PI) / 180, f2 = (b[0] * Math.PI) / 180;
  const dl = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function distM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const f1 = (a[0] * Math.PI) / 180, f2 = (b[0] * Math.PI) / 180;
  const df = ((b[0] - a[0]) * Math.PI) / 180, dl = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function makePuckElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="width:52px;height:52px;position:relative">
      <div style="position:absolute;inset:6px;border-radius:50%;
        background:rgba(96,165,250,0.20);
        box-shadow:0 0 16px 6px rgba(96,165,250,0.35);"></div>
      <svg width="52" height="52" viewBox="0 0 52 52" style="position:absolute;inset:0">
        <polygon points="26,5 36,40 26,31 16,40" fill="#1d4ed8" opacity="0.5" transform="translate(2,3)"/>
        <polygon points="26,5 36,40 26,31 16,40" fill="#60a5fa"
          stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="26" cy="26" r="4.5" fill="#1e40af" stroke="white" stroke-width="2"/>
      </svg>
    </div>`;
  return el;
}

function makeDestElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `<div style="
    width:18px;height:24px;
    background:#EF4444;border:2px solid white;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.6);
  "></div>`;
  return el;
}

export default function NavigationMap({ userLocation, destination, routeGeometry, heading, onBearingChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const puckRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const prevLocRef = useRef<[number, number] | null>(null);
  const lastBearingRef = useRef<number>(0);
  const followingRef = useRef(true);
  const [following, setFollowing] = useState(true);

  // Latest props for the one-time load handler
  const routeRef = useRef(routeGeometry);
  routeRef.current = routeGeometry;
  const bearingCbRef = useRef(onBearingChange);
  bearingCbRef.current = onBearingChange;

  // Padding pushes the camera target down-screen so the puck sits in the
  // lower third and most of the viewport shows the road ahead.
  function navPadding(map: maplibregl.Map): maplibregl.PaddingOptions {
    return { top: Math.round(map.getContainer().clientHeight * 0.45), bottom: 0, left: 0, right: 0 };
  }

  function followCamera(map: maplibregl.Map, lngLat: [number, number], bearing: number, instant = false) {
    map.easeTo({
      center: lngLat,
      bearing,
      pitch: NAV_PITCH,
      zoom: NAV_ZOOM,
      padding: navPadding(map),
      duration: instant ? 0 : EASE_MS,
      easing: (t) => t,
      essential: true,
    });
  }

  // ── Init map (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const startCenter = userLocation ? toLngLat(userLocation) : MANILA;
    // Face the first route segment if we don't have a heading yet
    let startBearing = heading ?? 0;
    if (heading == null && userLocation && routeRef.current && routeRef.current.length > 1) {
      startBearing = bearingBetween(userLocation, routeRef.current[Math.min(5, routeRef.current.length - 1)]);
    }
    lastBearingRef.current = startBearing;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_GL_STYLE,
      center: startCenter,
      zoom: userLocation ? NAV_ZOOM : 14,
      pitch: NAV_PITCH,
      bearing: startBearing,
      maxPitch: 70,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Route: dark casing under bright fill (Google Maps double-stroke)
      map.addSource("route", { type: "geojson", data: routeToGeoJSON(routeRef.current) });
      map.addLayer({
        id: "route-casing", type: "line", source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#1e3a8a", "line-width": 13, "line-opacity": 0.9 },
      });
      map.addLayer({
        id: "route-line", type: "line", source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#60a5fa", "line-width": 7 },
      });
      // Apply nav padding immediately so the puck starts low on screen
      if (userLocation) followCamera(map, toLngLat(userLocation), lastBearingRef.current, true);
    });

    // Puck rotates with the map (rotation = compass heading), lies flat with pitch
    const puck = new maplibregl.Marker({
      element: makePuckElement(),
      rotationAlignment: "map",
      pitchAlignment: "map",
    })
      .setLngLat(startCenter)
      .setRotation(startBearing)
      .addTo(map);
    puckRef.current = puck;

    // Any user gesture breaks follow mode (drag, rotate, pinch, wheel)
    const onUserInput = (e: { originalEvent?: Event }) => {
      if (!e.originalEvent) return; // ignore camera animations
      followingRef.current = false;
      setFollowing(false);
    };
    map.on("dragstart", onUserInput);
    map.on("rotatestart", onUserInput);
    map.on("pitchstart", onUserInput);
    map.on("zoomstart", onUserInput);
    map.on("rotate", () => bearingCbRef.current?.(map.getBearing()));

    return () => {
      map.remove();
      mapRef.current = null;
      puckRef.current = null;
      destMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Route geometry updates ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(routeToGeoJSON(routeGeometry));
  }, [routeGeometry]);

  // ── Destination marker ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!destination) {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      return;
    }
    const lngLat: [number, number] = [destination.lng, destination.lat];
    if (destMarkerRef.current) {
      destMarkerRef.current.setLngLat(lngLat);
    } else {
      destMarkerRef.current = new maplibregl.Marker({ element: makeDestElement(), anchor: "bottom" })
        .setLngLat(lngLat)
        .addTo(map);
    }
  }, [destination]);

  // ── Follow camera: GPS / heading updates ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    // Heading priority: device heading → bearing of actual movement → last known
    let hdg = heading;
    if (hdg == null && prevLocRef.current && distM(prevLocRef.current, userLocation) > 4) {
      hdg = bearingBetween(prevLocRef.current, userLocation);
    }
    if (hdg != null) lastBearingRef.current = hdg;
    prevLocRef.current = userLocation;

    const lngLat = toLngLat(userLocation);
    puckRef.current?.setLngLat(lngLat).setRotation(lastBearingRef.current);

    if (followingRef.current) followCamera(map, lngLat, lastBearingRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, heading]);

  function recenter() {
    const map = mapRef.current;
    followingRef.current = true;
    setFollowing(true);
    if (map && userLocation) followCamera(map, toLngLat(userLocation), lastBearingRef.current);
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!following && (
        <button
          onClick={recenter}
          className="absolute bottom-32 right-3 z-10 flex items-center gap-1.5 rounded-full bg-[#0a0e13]/90 px-3.5 py-2.5 shadow-lg backdrop-blur-sm border border-[#2a3a55]"
        >
          <LocateFixed size={14} className="text-[#60a5fa]" />
          <span className="font-display text-[10px] tracking-widest text-white">RE-CENTER</span>
        </button>
      )}
    </div>
  );
}
