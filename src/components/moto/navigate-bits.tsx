import { useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowLeft, ArrowRight, CornerDownLeft, Check, X, Play, Pause, MapPin, AlertCircle } from "lucide-react";
import { Card, SectionTitle, StatusDot } from "./layout";
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

export function NavigationView({
  waypoints, onEnd, bleConnected, sendBle, speedLimit, speedLimitEnabled,
}: {
  waypoints: NavWaypoint[];
  onEnd: (summary: { distance: number; durationMin: number; avgSpeed: number; maxSpeed: number }) => void;
  bleConnected: boolean;
  sendBle: (p: object) => void;
  speedLimit: number;
  speedLimitEnabled: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(waypoints[0]?.dist ?? 0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(42);
  const [stats, setStats] = useState({ distance: 0, time: 0, max: 0 });

  const current = waypoints[idx] ?? waypoints[waypoints.length - 1];
  const arrowInfo = ARROWS.find((a) => a.key === current.arrow)!;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        const dec = Math.max(20, Math.round(speed * 1000 / 3600));
        const next = r - dec;
        if (next <= 0) {
          setIdx((i) => Math.min(i + 1, waypoints.length - 1));
          const nxt = waypoints[Math.min(idx + 1, waypoints.length - 1)];
          return nxt?.dist ?? 0;
        }
        return next;
      });
      setStats((s) => ({
        distance: s.distance + speed / 3600,
        time: s.time + 1,
        max: Math.max(s.max, speed),
      }));
      // gentle random speed
      setSpeed((sp) => Math.max(20, Math.min(90, sp + (Math.random() - 0.5) * 6)));
    }, 1000);
    return () => clearInterval(t);
  }, [playing, idx, speed, waypoints]);

  useEffect(() => {
    if (bleConnected) sendBle({ arrow: current.arrow, dist: `${remaining}m` });
  }, [current.arrow, remaining, bleConnected, sendBle]);

  const total = useMemo(() => waypoints.reduce((a, b) => a + b.dist, 0), [waypoints]);
  const traveled = useMemo(() => waypoints.slice(0, idx).reduce((a, b) => a + b.dist, 0) + (waypoints[idx].dist - remaining), [waypoints, idx, remaining]);
  const pct = Math.min(100, Math.round((traveled / Math.max(total, 1)) * 100));
  const overLimit = speedLimitEnabled && speed > speedLimit;
  const arrowSym = arrowInfo.sym;

  function end() {
    onEnd({
      distance: +stats.distance.toFixed(1),
      durationMin: Math.max(1, Math.round(stats.time / 60)),
      avgSpeed: stats.time > 0 ? Math.round((stats.distance / (stats.time / 3600))) : 0,
      maxSpeed: Math.round(stats.max),
    });
  }

  return (
    <div className="space-y-3 px-4">
      {overLimit && (
        <div className="card-mn flex items-center gap-2 border-l-2 border-l-yellow-400 p-3 text-yellow-300 animate-slide-down">
          <AlertCircle size={16} /><span className="text-sm">SPEED LIMIT — Slow down (limit {speedLimit} km/h)</span>
        </div>
      )}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-[#1c1c1c] bg-[#050505]">
            <span className="font-display text-6xl text-white">{arrowSym}</span>
          </div>
          <div className="flex-1">
            <div className="font-display text-[10px] tracking-widest text-[#777]">NEXT TURN</div>
            <div className="font-display text-sm">{current.instr}</div>
            <div className="mt-2 font-display text-4xl">{remaining} <span className="text-base text-[#666]">M</span></div>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#141414]">
          <div className="h-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-[#777]">
          <span>{pct}% complete</span>
          <span>{((total - traveled) / 1000).toFixed(1)} km left</span>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card><div className="text-center"><div className="text-[10px] text-[#666]">SPEED</div><div className="font-display text-2xl">{Math.round(speed)}</div><div className="text-[10px] text-[#666]">KM/H</div></div></Card>
        <Card><div className="text-center"><div className="text-[10px] text-[#666]">DIST</div><div className="font-display text-2xl">{stats.distance.toFixed(1)}</div><div className="text-[10px] text-[#666]">KM</div></div></Card>
        <Card><div className="text-center"><div className="text-[10px] text-[#666]">TIME</div><div className="font-display text-2xl">{Math.floor(stats.time / 60).toString().padStart(2, "0")}:{(stats.time % 60).toString().padStart(2, "0")}</div><div className="text-[10px] text-[#666]">MIN</div></div></Card>
      </div>

      {bleConnected && (
        <Card className="border-l-2 border-l-white/60">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2"><StatusDot on /> <span className="font-display tracking-widest text-[#888]">SENT TO DEVICE</span></div>
            <code className="rounded bg-[#0a0a0a] px-2 py-1 text-[10px] text-white/80">{JSON.stringify({ arrow: current.arrow, dist: `${remaining}m` })}</code>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setPlaying((p) => !p)} className="card-mn flex items-center justify-center gap-2 py-3 font-display text-sm">
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "PAUSE" : "RESUME"}
        </button>
        <button onClick={end} className="rounded-xl bg-white py-3 font-display text-sm font-bold text-black">END RIDE</button>
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
