import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowLeft, ArrowRight, CornerDownLeft, Check, X, Play, Pause, MapPin, AlertCircle, Share2 } from "lucide-react";
import { Card, SectionTitle, StatusDot } from "./layout";
import { MapWidget } from "./map-widget";
import { CHECKLIST_ITEMS } from "@/lib/moto/data";
import type { SavedRoute } from "@/lib/moto/types";

const ARROWS: { sym: string; icon: typeof ArrowUp; key: "LEFT" | "RIGHT" | "STRAIGHT" | "UTURN" }[] = [
  { sym: "↑", icon: ArrowUp, key: "STRAIGHT" },
  { sym: "←", icon: ArrowLeft, key: "LEFT" },
  { sym: "→", icon: ArrowRight, key: "RIGHT" },
  { sym: "↩", icon: CornerDownLeft, key: "UTURN" },
];

export type NavWaypoint = { instr: string; arrow: typeof ARROWS[number]["key"]; dist: number };
export const SAMPLE_WAYPOINTS: NavWaypoint[] = [
  { instr: "Head NORTH on EDSA", arrow: "STRAIGHT", dist: 600 },
  { instr: "Turn LEFT onto Rizal Ave", arrow: "LEFT", dist: 320 },
  { instr: "Continue STRAIGHT for 1.2km", arrow: "STRAIGHT", dist: 1200 },
  { instr: "Turn RIGHT onto Magsaysay Blvd", arrow: "RIGHT", dist: 240 },
  { instr: "U-turn at intersection", arrow: "UTURN", dist: 80 },
  { instr: "Arrive at destination", arrow: "STRAIGHT", dist: 0 },
];

export function ChecklistModal({ open, onClose, onAllClear, onSkip }: { open: boolean; onClose: () => void; onAllClear: () => void; onSkip: () => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => { if (open) setChecked({}); }, [open]);
  if (!open) return null;
  const allChecked = CHECKLIST_ITEMS.every((i) => checked[i.key]);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030303]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[430px] px-4 pb-12 pt-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-xl tracking-widest">LONG RIDE CHECKLIST</div>
            <div className="text-xs text-[#888]">Complete before starting your ride</div>
          </div>
          <button onClick={onClose} className="rounded-md border border-[#1c1c1c] p-2"><X size={16} /></button>
        </div>
        <div className="mt-4 space-y-2">
          {CHECKLIST_ITEMS.map((i) => {
            const on = !!checked[i.key];
            return (
              <button
                key={i.key}
                onClick={() => setChecked((c) => ({ ...c, [i.key]: !c[i.key] }))}
                className={`card-mn w-full p-3 text-left transition-all ${on ? "border-white/70" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md border ${on ? "border-white bg-white text-black" : "border-[#333]"}`}>
                    {on && <Check size={14} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-sm">{i.title}</div>
                    <div className="text-[11px] text-[#888]">{i.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button
          disabled={!allChecked}
          onClick={onAllClear}
          className={`mt-4 w-full rounded-lg py-3 font-display font-bold ${allChecked ? "bg-white text-black" : "bg-[#1a1a1a] text-[#555]"}`}
        >
          ALL CLEAR — START RIDE
        </button>
        <button onClick={onSkip} className="mt-2 w-full text-center text-xs text-[#666]">SKIP CHECKLIST</button>
      </div>
    </div>
  );
}

// Haversine distance between two GPS coords in metres
function haversineM([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const R = 6371000;
  const f1 = (lat1 * Math.PI) / 180, f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function compassLabel(deg: number): string {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function eta(speedKmh: number, remainingM: number): string {
  if (speedKmh < 1 || remainingM <= 0) return "--:--";
  const mins = Math.round((remainingM / 1000) / (speedKmh / 60));
  const arr = new Date(Date.now() + mins * 60_000);
  return arr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function NavigationView({
  waypoints, onEnd, bleConnected, sendBle, speedLimit, speedLimitEnabled,
  userLocation, destination, routeGeometry, userHeading,
}: {
  waypoints: NavWaypoint[];
  onEnd: (summary: { distance: number; durationMin: number; avgSpeed: number; maxSpeed: number }) => void;
  bleConnected: boolean;
  sendBle: (p: object) => void;
  speedLimit: number;
  speedLimitEnabled: boolean;
  userLocation?: [number, number] | null;
  destination?: { lat: number; lng: number; name?: string } | null;
  routeGeometry?: [number, number][];
  /** Compass heading 0–360° for the user arrow and map bearing */
  userHeading?: number | null;
}) {
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(waypoints[0]?.dist ?? 0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [stats, setStats] = useState({ distance: 0, time: 0, max: 0 });

  const prevGpsRef = useRef<[number, number] | null>(null);
  const prevGpsTimeRef = useRef<number>(Date.now());
  const hasGps = !!userLocation;

  const current = waypoints[idx] ?? waypoints[waypoints.length - 1];
  const arrowInfo = ARROWS.find((a) => a.key === current.arrow)!;

  // ── Real GPS advancement ────────────────────────────────────────────────────
  // Fires every time the parent's watchPosition callback updates userLocation.
  useEffect(() => {
    if (!userLocation) return;

    if (!prevGpsRef.current) {
      prevGpsRef.current = userLocation;
      prevGpsTimeRef.current = Date.now();
      return;
    }

    const dist = haversineM(prevGpsRef.current, userLocation);
    const dtSec = (Date.now() - prevGpsTimeRef.current) / 1000;
    prevGpsRef.current = userLocation;
    prevGpsTimeRef.current = Date.now();

    if (dist < 3) return; // ignore GPS jitter under 3 m

    const kmh = dtSec > 0 ? (dist / dtSec) * 3.6 : 0;
    if (kmh > 0 && kmh < 200) setSpeed(kmh);

    setStats((s) => ({ ...s, distance: s.distance + dist / 1000, max: Math.max(s.max, kmh) }));

    setRemaining((r) => {
      const next = r - dist;
      if (next <= 0) {
        setIdx((i) => Math.min(i + 1, waypoints.length - 1));
        return waypoints[Math.min(idx + 1, waypoints.length - 1)]?.dist ?? 0;
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // ── GPS time counter ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasGps || !playing) return;
    const t = setInterval(() => setStats((s) => ({ ...s, time: s.time + 1 })), 1000);
    return () => clearInterval(t);
  }, [hasGps, playing]);

  // ── Simulation (fallback when no real GPS) ─────────────────────────────────
  useEffect(() => {
    if (hasGps) return; // real GPS takes over — don't simulate
    if (!playing) return;

    const simSpeed = { current: 42 };
    const t = setInterval(() => {
      simSpeed.current = Math.max(20, Math.min(90, simSpeed.current + (Math.random() - 0.5) * 6));
      setSpeed(simSpeed.current);

      setRemaining((r) => {
        const dec = Math.max(20, Math.round(simSpeed.current * 1000 / 3600));
        const next = r - dec;
        if (next <= 0) {
          setIdx((i) => Math.min(i + 1, waypoints.length - 1));
          return waypoints[Math.min(idx + 1, waypoints.length - 1)]?.dist ?? 0;
        }
        return next;
      });
      setStats((s) => ({
        distance: s.distance + simSpeed.current / 3600,
        time: s.time + 1,
        max: Math.max(s.max, simSpeed.current),
      }));
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, hasGps, waypoints]);

  useEffect(() => {
    if (bleConnected) sendBle({ arrow: current.arrow, dist: `${remaining}m` });
  }, [current.arrow, remaining, bleConnected, sendBle]);

  const total = useMemo(() => waypoints.reduce((a, b) => a + b.dist, 0), [waypoints]);
  const traveled = useMemo(
    () => waypoints.slice(0, idx).reduce((a, b) => a + b.dist, 0) + ((waypoints[idx]?.dist ?? 0) - remaining),
    [waypoints, idx, remaining]
  );
  const pct = Math.min(100, Math.round((traveled / Math.max(total, 1)) * 100));
  const overLimit = speedLimitEnabled && speed > speedLimit;
  const arrowSym = arrowInfo.sym;

  function end() {
    onEnd({
      distance: +stats.distance.toFixed(1),
      durationMin: Math.max(1, Math.round(stats.time / 60)),
      avgSpeed: stats.time > 0 ? Math.round(stats.distance / (stats.time / 3600)) : 0,
      maxSpeed: Math.round(stats.max),
    });
  }

  function fmt(m: number): string {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  }

  function shareRoute() {
    const destName = destination?.name ?? "destination";
    const body = `Following my MotoNav ride to ${destName}`;
    const url = userLocation && destination
      ? `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${destination.lat},${destination.lng}`
      : userLocation
      ? `https://maps.google.com/?q=${userLocation[0]},${userLocation[1]}`
      : "https://maps.google.com";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "MotoNav", text: body, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${body}\n${url}`).catch(() => {});
    }
  }

  const nextWp = waypoints[idx + 1];
  const nextArrow = ARROWS.find((a) => a.key === nextWp?.arrow)?.sym ?? "↑";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0B0F14]">

      {/* ── 3D perspective driving-view map ──────────────────────────────────
           Key fix: NO overflow:hidden here — the perspective wrapper must be
           transparent so the 3D-projected content (which extends above/below
           the layout box) renders freely. NavigationView's own overflow-hidden
           clips everything at the screen edge.

           Inner div extends 80% above the viewport (top:-80%) so that after
           rotateX(25deg) + perspective(700px), the projected top of the map
           reaches the viewport top (math: with 25° tilt + 80% extension the
           top projects to ~12% from viewport top, hidden behind the direction
           card). Bottom stays pinned at viewport bottom via transformOrigin
           at 100% (bottom center of inner div).                              */}
      <div
        className="absolute inset-0 z-0 bg-[#0d1117]"
        style={{ perspective: "700px" }}
      >
        <div
          style={{
            position: "absolute",
            top: "-80%",
            bottom: 0,
            left: "-25%",
            right: "-25%",
            transform: `rotate(${-(userHeading ?? 0)}deg) rotateX(25deg)`,
            transformOrigin: "50% 100%",
            transition: "transform 0.3s linear",
            willChange: "transform",
          }}
        >
          <MapWidget
            userLocation={userLocation ?? null}
            destination={destination ?? null}
            routeGeometry={routeGeometry}
            height="h-full"
            className="rounded-none"
            followUser
            heading={userHeading}
          />
        </div>

        {/* Depth-fade gradient — darkens the "horizon" to enhance distance perception */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(10,14,19,0.55) 0%, transparent 30%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Compass rose (top-right) ──────────────────────────────────────── */}
      <div className="absolute right-3 top-3 z-20">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#333] bg-[#0a0e13]/90 shadow-lg">
          <svg
            viewBox="0 0 32 32"
            width="36"
            height="36"
            style={{ transform: `rotate(${-(userHeading ?? 0)}deg)`, transformOrigin: "50% 50%", transition: "transform 0.3s linear" }}
          >
            {/* N — red */}
            <polygon points="16,4 14,15 16,13 18,15" fill="#ef4444" />
            {/* S — white */}
            <polygon points="16,28 14,17 16,19 18,17" fill="#666" />
            {/* Center dot */}
            <circle cx="16" cy="16" r="2.5" fill="#60a5fa" />
          </svg>
        </div>
        <div className="mt-0.5 text-center font-display text-[8px] tracking-widest text-[#555]">
          {compassLabel(userHeading ?? 0)}
        </div>
      </div>

      {/* ── Share button (top-left of compass) ───────────────────────────── */}
      <button
        onClick={shareRoute}
        className="absolute right-14 top-3 z-20 flex items-center gap-1.5 rounded-full bg-[#0a0e13]/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
      >
        <Share2 size={12} className="text-white" />
        <span className="font-display text-[9px] tracking-widest text-white">SHARE</span>
      </button>

      {/* ── Top overlay: direction card ───────────────────────────────────── */}
      <div className="relative z-10 px-3 pt-3">
        {overLimit && (
          <div className="mb-2 flex items-center gap-1.5 rounded-xl bg-[#0B0F14]/90 px-3 py-2 text-yellow-300">
            <AlertCircle size={13} />
            <span className="font-display text-[11px] tracking-wide">OVER SPEED LIMIT ({speedLimit} km/h)</span>
          </div>
        )}

        {/* Direction card — distance is the largest element (Google Maps style) */}
        <div className="overflow-hidden rounded-2xl shadow-2xl">
          <div className="flex items-stretch">
            {/* Turn arrow panel */}
            <div className="flex w-[72px] shrink-0 flex-col items-center justify-center gap-1 bg-[#2563EB] px-2 py-5">
              <span className="select-none font-display text-5xl leading-none text-white">{arrowSym}</span>
            </div>
            {/* Distance (BIG) + instruction */}
            <div className="flex flex-1 flex-col justify-center bg-[#162542] px-4 py-3">
              <div className="font-display text-4xl font-bold leading-none text-white">{fmt(remaining)}</div>
              <div className="mt-1.5 text-sm font-medium leading-snug text-[#94b8e8]">{current.instr}</div>
            </div>
          </div>

          {/* "Then..." next instruction */}
          {nextWp && (
            <div className="flex items-center gap-2 bg-[#0f1b2d] px-4 py-2">
              <span className="text-sm text-[#6ea8fe]">{nextArrow}</span>
              <span className="text-[11px] text-[#6ea8fe]">Then {nextWp.instr}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-[#3B82F6] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Spacer — map shows through */}
      <div className="flex-1" />

      {/* ── Bottom overlay: ETA + speed + controls ────────────────────────── */}
      <div className="relative z-10 px-3 pb-3">
        {bleConnected && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#0a0e13]/90 px-3 py-1.5">
            <StatusDot on />
            <span className="font-display text-[10px] tracking-widest text-[#888]">SENT TO DEVICE</span>
            <code className="ml-auto text-[10px] text-white/50">{current.arrow}</code>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-[#0a0e13]/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">

            {/* ETA block */}
            <div className="flex-1 min-w-0">
              <div className="font-display text-2xl font-bold text-white">
                {stats.time < 60 ? `${stats.time}s` : `${Math.round(stats.time / 60)} min`}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#555]">
                <span>{fmt(Math.max(0, total - traveled))}</span>
                <span>·</span>
                <span>{stats.distance.toFixed(1)} km</span>
                {speed > 2 && (
                  <>
                    <span>·</span>
                    <span className="text-[#6ea8fe]">ETA {eta(speed, total - traveled)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Speed */}
            <div className="border-l border-[#1c1c1c] pl-3 text-center">
              <div className="font-display text-xl font-bold text-white">{Math.round(speed)}</div>
              <div className="text-[9px] text-[#555]">KM/H</div>
            </div>

            {/* Controls */}
            <div className="flex gap-1.5 border-l border-[#1c1c1c] pl-3">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="rounded-xl border border-[#222] bg-[#111] p-2.5 text-white"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={end}
                className="rounded-xl bg-white px-4 py-2.5 font-display text-xs font-bold text-black"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SavedRoutesList({ routes, onStart, onToggleFav, onDelete }: { routes: SavedRoute[]; onStart: (r: SavedRoute) => void; onToggleFav: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2 px-4">
      {routes.map((r) => (
        <div key={r.id} className="card-mn p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#666]" />
                <span className="font-display text-sm">{r.name}</span>
                {r.difficulty === "Long Ride" && <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[9px] tracking-widest text-white">LONG</span>}
              </div>
              <div className="mt-1 text-[11px] text-[#888]">{r.distance} km • {r.durationMin} min • {r.turns} turns</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onToggleFav(r.id)} className={`text-xs ${r.favorite ? "text-white" : "text-[#555]"}`}>★</button>
              {!r.preset && <button onClick={() => onDelete(r.id)} className="text-[#555]"><X size={14} /></button>}
              <button onClick={() => onStart(r)} className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-black">START</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { SectionTitle };
