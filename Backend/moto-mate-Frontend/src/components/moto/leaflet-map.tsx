// Client-only — loaded lazily by map-widget.tsx (never runs during SSR)
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";

// Navigation arrow: large directional chevron with glow, rotated by heading via JS
const NAV_ARROW_ICON = L.divIcon({
  className: "",
  html: `
    <div style="width:56px;height:56px;position:relative">
      <!-- Glow pulse -->
      <div style="position:absolute;inset:4px;border-radius:50%;
        background:rgba(96,165,250,0.22);
        box-shadow:0 0 18px 6px rgba(96,165,250,0.35);"></div>
      <svg data-nav-arrow width="56" height="56" viewBox="0 0 56 56"
        style="position:absolute;inset:0;transform-origin:28px 28px;transition:transform 0.3s ease">
        <!-- Shadow polygon for depth -->
        <polygon points="28,6 38,42 28,33 18,42" fill="#1d4ed8" opacity="0.5"
          transform="translate(2,3)"/>
        <!-- Main arrow -->
        <polygon points="28,6 38,42 28,33 18,42" fill="#60a5fa"
          stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
        <!-- Center accuracy dot -->
        <circle cx="28" cy="28" r="5" fill="#1e40af" stroke="white" stroke-width="2"/>
      </svg>
    </div>`,
  iconSize: [56, 56],
  iconAnchor: [28, 28],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:24px;
    background:#EF4444;border:2px solid white;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.6);
  "></div>`,
  iconSize: [18, 24],
  iconAnchor: [9, 24],
});

type DestType = { lat: number; lng: number; name?: string } | null;

type Props = {
  userLocation: [number, number] | null;
  destination?: DestType;
  routeGeometry?: [number, number][];
  /** When true, map pans to follow the user smoothly (navigation mode) */
  followUser?: boolean;
  /** Compass heading in degrees 0-360 (0 = North). Rotates the user arrow. */
  heading?: number | null;
};

function ViewManager({ userLocation, destination, routeGeometry, followUser }: Props) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    if (routeGeometry && routeGeometry.length > 1) {
      map.fitBounds(routeGeometry as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 17 });
      initializedRef.current = true;
    } else if (userLocation && destination) {
      map.fitBounds([userLocation, [destination.lat, destination.lng]], { padding: [40, 40], maxZoom: 16 });
      initializedRef.current = true;
    } else if (userLocation) {
      map.setView(userLocation, followUser ? 18 : 16);
      initializedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!followUser || !userLocation) return;
    map.panTo(userLocation, { animate: true, duration: 0.6 });
  }, [map, followUser, userLocation]);

  return null;
}

const MANILA: [number, number] = [14.5995, 120.9842];
const CARTO = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>';

export default function LeafletMap({ userLocation, destination, routeGeometry, followUser, heading }: Props) {
  const center = userLocation ?? MANILA;
  const markerRef = useRef<L.Marker | null>(null);

  // Smoothly rotate the SVG nav arrow without re-creating the marker
  useEffect(() => {
    if (!markerRef.current || heading == null) return;
    const el = markerRef.current.getElement();
    if (!el) return;
    const svg = el.querySelector("[data-nav-arrow]") as HTMLElement | null;
    if (svg) svg.style.transform = `rotate(${heading}deg)`;
  }, [heading]);

  return (
    <MapContainer
      center={center}
      zoom={followUser ? 18 : 15}
      scrollWheelZoom
      style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
      attributionControl={false}
      zoomControl={!followUser}
    >
      <TileLayer url={CARTO} attribution={ATTR} />

      {/* Route: dark outline then bright fill (Google Maps double-stroke) */}
      {routeGeometry && routeGeometry.length > 1 && (
        <Polyline positions={routeGeometry} color="#1e3a8a" weight={14} opacity={0.85} />
      )}
      {routeGeometry && routeGeometry.length > 1 && (
        <Polyline positions={routeGeometry} color="#60a5fa" weight={8} opacity={1} />
      )}

      {userLocation && (
        <Marker
          position={userLocation}
          icon={NAV_ARROW_ICON}
          ref={(m) => { markerRef.current = m; }}
        />
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
      )}

      <ViewManager
        userLocation={userLocation}
        destination={destination}
        routeGeometry={routeGeometry}
        followUser={followUser}
      />
    </MapContainer>
  );
}
