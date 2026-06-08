import { useEffect, useState } from "react";
import { Card, SectionTitle, StatusDot } from "./layout";
import { Cloud, CloudRain, Sun, Moon, Wind, Gauge, Wrench, ChevronRight, Play, X } from "lucide-react";
import { SAFETY_TIPS } from "@/lib/moto/data";
import type { Ride, Vehicle } from "@/lib/moto/types";

const iconMap: Record<string, typeof Sun> = { Sun, Moon, Cloud, CloudRain, Wind };

export function WeatherCard({ data, onRefresh }: { data: ReturnType<typeof import("@/lib/moto/store").useWeather>; onRefresh: () => void }) {
  const Icon = iconMap[data.icon] ?? Sun;
  const ridingColor = data.riding === "GOOD" ? "text-white border-white/70" : data.riding === "CAUTION" ? "text-[#bbb] border-[#555]" : "text-red-400 border-red-700";
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#0f0f0f] p-2"><Icon size={22} /></div>
          <div>
            <div className="font-display text-2xl leading-none">{data.temp}°C</div>
            <div className="text-xs text-[#888]">{data.cond} • {data.location}</div>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-md border px-2 py-1 text-[10px] font-display tracking-widest ${ridingColor}`}>{data.riding}</span>
          <button onClick={onRefresh} className="mt-1 block text-[10px] text-[#666]">REFRESH</button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#141414] pt-3 text-[11px] text-[#888]">
        <span>Humidity {data.humidity}%</span>
        <span>Wind {data.wind} km/h</span>
        <div className="flex gap-3">
          {data.forecast.map((f, i) => {
            const FI = iconMap[f.icon] ?? Sun;
            return <div key={i} className="flex items-center gap-1"><FI size={12} /><span>{f.temp}°</span></div>;
          })}
        </div>
      </div>
    </Card>
  );
}

export function SpeedHero({ speed, trip, time, avg }: { speed: number; trip: number; time: string; avg: number }) {
  return (
    <Card>
      <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-white/15" />
        <div className="absolute inset-3 rounded-full border border-white/8" />
        <div className="absolute inset-6 rounded-full bg-[#050505]" />
        <div className="relative text-center">
          <div className="font-display text-5xl font-bold tracking-tight text-white">{speed}</div>
          <div className="font-display text-[10px] tracking-[0.3em] text-[#777]">KM/H</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#141414] pt-3 text-center">
        <div><div className="text-[10px] text-[#666]">TRIP</div><div className="font-display">{trip.toFixed(1)} km</div></div>
        <div><div className="text-[10px] text-[#666]">TIME</div><div className="font-display">{time}</div></div>
        <div><div className="text-[10px] text-[#666]">AVG</div><div className="font-display">{avg} km/h</div></div>
      </div>
    </Card>
  );
}

export function RideScoreGauge({ score, issues }: { score: number; issues: string[] }) {
  const R = 52, C = 2 * Math.PI * R;
  const offset = C - (C * score) / 100;
  const label = score >= 80 ? "READY TO RIDE" : score >= 60 ? "CHECK RECOMMENDED" : "NEEDS ATTENTION";
  const pulse = score < 60 ? "animate-pulse" : "";
  return (
    <Card>
      <div className="flex items-center gap-4">
        <svg width={120} height={120} className={pulse}>
          <circle cx={60} cy={60} r={R} stroke="#141414" strokeWidth="8" fill="none" />
          <circle
            cx={60} cy={60} r={R} stroke="#fff" strokeWidth="8" fill="none"
            strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dashoffset 800ms ease" }}
          />
          <text x="60" y="58" textAnchor="middle" fill="#fff" fontFamily="Orbitron" fontSize="22" fontWeight="700">{score}</text>
          <text x="60" y="74" textAnchor="middle" fill="#666" fontFamily="Orbitron" fontSize="9">SCORE</text>
        </svg>
        <div className="flex-1">
          <div className="font-display text-[10px] tracking-widest text-[#777]">RIDE READY</div>
          <div className="font-display text-lg leading-tight">{label}</div>
          {issues.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-[11px] text-[#888]">
              {issues.slice(0, 3).map((it, i) => <li key={i}>• {it}</li>)}
            </ul>
          ) : <div className="mt-2 text-[11px] text-[#888]">All systems nominal.</div>}
        </div>
      </div>
    </Card>
  );
}

export function TipCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SAFETY_TIPS.length), 8000);
    return () => clearInterval(t);
  }, []);
  return (
    <Card className="border-l-2 border-l-white/70">
      <div className="font-display text-[10px] tracking-widest text-[#777]">SAFETY TIP</div>
      <div key={i} className="mt-1 text-sm text-white animate-fade-in-up">{SAFETY_TIPS[i]}</div>
    </Card>
  );
}

export function QuickStats({ totalDistance, lastRide, totalRides, odometer }: { totalDistance: number; lastRide: number; totalRides: number; odometer: number }) {
  const items = [
    { label: "TOTAL", value: `${totalDistance.toFixed(0)} km` },
    { label: "LAST RIDE", value: `${lastRide.toFixed(0)} km` },
    { label: "RIDES", value: `${totalRides}` },
    { label: "ODO", value: `${odometer.toLocaleString()} km` },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {items.map((s) => (
        <div key={s.label} className="card-mn p-2 text-center">
          <div className="font-display text-[9px] tracking-widest text-[#666]">{s.label}</div>
          <div className="mt-1 font-display text-sm">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export function AlertBanner({ title, desc, onDismiss, onAction, actionLabel }: { title: string; desc: string; onDismiss: () => void; onAction?: () => void; actionLabel?: string }) {
  return (
    <div className="card-mn mx-4 mt-2 flex items-start gap-3 border-l-2 border-l-white p-3 animate-slide-down">
      <Wrench size={18} className="mt-0.5 text-white" />
      <div className="flex-1">
        <div className="font-display text-sm">{title}</div>
        <div className="text-xs text-[#888]">{desc}</div>
        {onAction && actionLabel && (
          <button onClick={onAction} className="mt-2 rounded-md bg-white px-3 py-1 text-[11px] font-bold text-black">{actionLabel}</button>
        )}
      </div>
      <button onClick={onDismiss} className="text-[#666]"><X size={14} /></button>
    </div>
  );
}

export function RecentRidesList({ rides, onStart }: { rides: Ride[]; onStart: () => void }) {
  return (
    <div className="px-4">
      {rides.length === 0 ? (
        <div className="card-mn p-6 text-center">
          <Gauge size={28} className="mx-auto text-[#555]" />
          <div className="mt-2 font-display text-sm">No rides yet</div>
          <div className="text-xs text-[#777]">Hit START RIDE to log your first one.</div>
          <button onClick={onStart} className="mt-3 inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-xs font-bold text-black"><Play size={14} /> START</button>
        </div>
      ) : (
        <div className="space-y-2">
          {rides.slice(0, 3).map((r) => (
            <div key={r.id} className="card-mn p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-sm">{r.end}</div>
                  <div className="text-[11px] text-[#888]">{new Date(r.date).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm">{r.distance.toFixed(1)} km</div>
                  <div className="text-[11px] text-[#888]">{r.durationMin} min</div>
                </div>
                <ChevronRight size={16} className="ml-2 text-[#444]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar({ bleConnected, vehicle }: { bleConnected: boolean; vehicle?: Vehicle }) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 pt-4">
      <div>
        <div className="font-display text-lg font-extrabold tracking-[0.25em] text-white">MOTO NAV</div>
        {vehicle && <div className="text-[11px] text-[#666]">{vehicle.nickname || `${vehicle.brand} ${vehicle.model}`}</div>}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-[#141414] bg-[#080808] px-2 py-1">
        <StatusDot on={bleConnected} />
        <span className="font-display text-[10px] tracking-widest text-[#aaa]">DEVICE</span>
      </div>
    </div>
  );
}

export { SectionTitle };
