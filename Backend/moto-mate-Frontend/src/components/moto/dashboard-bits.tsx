import { useEffect, useState } from "react";
import { Card, SectionTitle, StatusDot } from "./layout";
import {
  Cloud, CloudRain, Sun, Moon, Wind, Gauge, Wrench, ChevronRight, Play, X,
  Navigation as NavIcon, MapPin, Phone, Bluetooth, Satellite, Bike,
  Droplets, BatteryFull, Fuel, ShieldCheck, AlertTriangle, CheckCircle2,
  CloudDrizzle, Thermometer, ChevronRight as ChevR,
} from "lucide-react";
import { SAFETY_TIPS } from "@/lib/moto/data";
import type { Ride, Vehicle } from "@/lib/moto/types";

const iconMap: Record<string, typeof Sun> = { Sun, Moon, Cloud, CloudRain, Wind };

/* ============================================================
   TOP BAR
============================================================ */
export function TopBar({ bleConnected, vehicle }: { bleConnected: boolean; vehicle?: Vehicle }) {
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Ride safe" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="flex items-center justify-between px-5 pb-4 pt-5">
      <div>
        <div className="text-xs font-medium text-[#94A3B8]">{greet}</div>
        <div className="mt-0.5 text-xl font-semibold tracking-tight text-white">
          {vehicle ? (vehicle.nickname || `${vehicle.brand} ${vehicle.model}`) : "MotoNav"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171F2B] ring-1 ring-[#1f2937]">
          <Bluetooth size={16} className={bleConnected ? "text-[#3B82F6]" : "text-[#64748B]"} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HERO – SPEED + STATUS
============================================================ */
export function SpeedHero({ speed, trip, time, avg }: { speed: number; trip: number; time: string; avg: number }) {
  const riding = speed > 0;
  return (
    <div className="card-elevated relative overflow-hidden p-5">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#3B82F6]/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-[#3B82F6]/5 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-2 w-2 rounded-full ${riding ? "bg-[#22C55E] animate-ble-breath" : "bg-[#475569]"}`} />
            <span className="text-xs font-medium tracking-wide text-[#94A3B8]">
              {riding ? "RIDING" : "PARKED"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">Live telemetry</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusChip icon={Satellite} label="GPS" ok={riding} />
          <StatusChip icon={Bluetooth} label="BT" ok={true} />
        </div>
      </div>

      {/* Speed display */}
      <div className="relative mt-3 flex items-end justify-center gap-2">
        <div key={speed} className="animate-speed-tick text-[88px] font-bold leading-none tracking-tight tabular-nums text-white">
          {speed}
        </div>
        <div className="pb-3 text-sm font-medium text-[#94A3B8]">km/h</div>
      </div>

      {/* Speed bar */}
      <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#0F1620]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] transition-all duration-500"
          style={{ width: `${Math.min(100, (speed / 180) * 100)}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#1f2937] pt-4">
        <Metric label="Trip" value={`${trip.toFixed(1)}`} unit="km" />
        <Metric label="Time" value={time} />
        <Metric label="Avg" value={`${avg}`} unit="km/h" />
      </div>
    </div>
  );
}

function StatusChip({ icon: Icon, label, ok }: { icon: typeof Satellite; label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-[#0F1620] px-2.5 py-1 ring-1 ring-[#1f2937]">
      <Icon size={11} className={ok ? "text-[#22C55E]" : "text-[#64748B]"} />
      <span className="text-[10px] font-semibold tracking-wide text-[#94A3B8]">{label}</span>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{label}</div>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="text-xl font-semibold tabular-nums text-white">{value}</span>
        {unit && <span className="text-[11px] font-medium text-[#94A3B8]">{unit}</span>}
      </div>
    </div>
  );
}

/* ============================================================
   QUICK ACTIONS
============================================================ */
export function QuickActions({
  onStartRide, onNavigateHome, onFindVehicle, onEmergency,
}: { onStartRide: () => void; onNavigateHome: () => void; onFindVehicle: () => void; onEmergency: () => void }) {
  const items = [
    { label: "Start Ride", icon: Play, onClick: onStartRide, accent: "primary" as const },
    { label: "Navigate Home", icon: NavIcon, onClick: onNavigateHome },
    { label: "Find Vehicle", icon: MapPin, onClick: onFindVehicle },
    { label: "Emergency", icon: Phone, onClick: onEmergency, accent: "danger" as const },
  ];
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {items.map((it) => {
        const Icon = it.icon;
        const isPrimary = it.accent === "primary";
        const isDanger = it.accent === "danger";
        return (
          <button
            key={it.label}
            onClick={it.onClick}
            className={`group flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200 active:scale-95 ${
              isPrimary
                ? "border-[#3B82F6]/40 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/15"
                : isDanger
                ? "border-[#EF4444]/30 bg-[#EF4444]/5 hover:bg-[#EF4444]/10"
                : "border-[#1f2937] bg-[#171F2B] hover:bg-[#1E2735]"
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isPrimary ? "bg-[#3B82F6] text-white" : isDanger ? "bg-[#EF4444]/15 text-[#EF4444]" : "bg-[#0F1620] text-[#94A3B8] group-hover:text-white"
            }`}>
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <span className="text-[10.5px] font-semibold leading-tight text-white">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   VEHICLE HEALTH (replaces RideScoreGauge — same export name)
============================================================ */
type HealthLevel = "good" | "warn" | "crit";
const HEALTH_COLORS: Record<HealthLevel, { dot: string; bar: string; text: string; bg: string }> = {
  good: { dot: "bg-[#22C55E]", bar: "bg-[#22C55E]", text: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
  warn: { dot: "bg-[#F59E0B]", bar: "bg-[#F59E0B]", text: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  crit: { dot: "bg-[#EF4444]", bar: "bg-[#EF4444]", text: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
};

export function VehicleHealthCard({
  tirePsi = 32, batteryPct = 86, fuelPct = 64, maintenanceLevel = "good",
  onViewDetails,
}: {
  tirePsi?: number; batteryPct?: number; fuelPct?: number;
  maintenanceLevel?: HealthLevel; onViewDetails?: () => void;
}) {
  const tireLevel: HealthLevel = tirePsi < 28 ? "crit" : tirePsi < 30 ? "warn" : "good";
  const batLevel: HealthLevel = batteryPct < 25 ? "crit" : batteryPct < 50 ? "warn" : "good";
  const fuelLevel: HealthLevel = fuelPct < 15 ? "crit" : fuelPct < 30 ? "warn" : "good";

  const items: { icon: typeof Droplets; label: string; value: string; level: HealthLevel }[] = [
    { icon: Droplets, label: "Tire Pressure", value: `${tirePsi} psi`, level: tireLevel },
    { icon: BatteryFull, label: "Battery", value: `${batteryPct}%`, level: batLevel },
    { icon: Fuel, label: "Fuel", value: `${fuelPct}%`, level: fuelLevel },
    { icon: Wrench, label: "Maintenance", value: maintenanceLevel === "good" ? "On track" : maintenanceLevel === "warn" ? "Due soon" : "Overdue", level: maintenanceLevel },
  ];
  const worst: HealthLevel = items.some(i => i.level === "crit") ? "crit" : items.some(i => i.level === "warn") ? "warn" : "good";
  const headline = worst === "good" ? "All systems healthy" : worst === "warn" ? "Attention needed" : "Action required";
  const HeadIcon = worst === "good" ? ShieldCheck : worst === "warn" ? AlertTriangle : AlertTriangle;
  const C = HEALTH_COLORS[worst];

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-[#1f2937] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${C.bg}`}>
            <HeadIcon size={18} className={C.text} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Vehicle Health</div>
            <div className="text-[15px] font-semibold text-white">{headline}</div>
          </div>
        </div>
        {onViewDetails && (
          <button onClick={onViewDetails} className="flex items-center gap-1 text-xs font-medium text-[#3B82F6]">
            Details <ChevR size={14} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#1f2937]">
        {items.map((it, idx) => {
          const C = HEALTH_COLORS[it.level];
          const Icon = it.icon;
          return (
            <div key={it.label} className={`p-4 ${idx < 2 ? "border-b border-[#1f2937]" : ""}`}>
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-[#64748B]" />
                <span className="text-[11px] font-medium text-[#94A3B8]">{it.label}</span>
                <span className={`ml-auto h-1.5 w-1.5 rounded-full ${C.dot}`} />
              </div>
              <div className="mt-2 text-[17px] font-semibold tabular-nums text-white">{it.value}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* Kept export name for backward compat with index.tsx */
export function RideScoreGauge({ score, issues }: { score: number; issues: string[] }) {
  const maintenanceLevel: HealthLevel = score >= 80 ? "good" : score >= 60 ? "warn" : "crit";
  // derive simulated values
  const tirePsi = score >= 80 ? 32 : score >= 60 ? 29 : 26;
  const batteryPct = score >= 80 ? 86 : score >= 60 ? 58 : 32;
  const fuelPct = score >= 80 ? 72 : score >= 60 ? 38 : 18;
  return (
    <>
      <VehicleHealthCard
        tirePsi={tirePsi}
        batteryPct={batteryPct}
        fuelPct={fuelPct}
        maintenanceLevel={maintenanceLevel}
      />
      {issues.length > 0 && (
        <div className="mt-2 space-y-2">
          {issues.slice(0, 2).map((it, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/5 p-3">
              <AlertTriangle size={16} className="mt-0.5 text-[#F59E0B]" />
              <div className="flex-1">
                <div className="text-[13px] font-medium text-white">{it}</div>
                <div className="text-[11px] text-[#94A3B8]">Check before your next ride.</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================
   WEATHER
============================================================ */
export function WeatherCard({ data, onRefresh }: { data: ReturnType<typeof import("@/lib/moto/store").useWeather>; onRefresh: () => void }) {
  const Icon = iconMap[data.icon] ?? Sun;
  const ridingClass = data.riding === "GOOD"
    ? "bg-[#22C55E]/10 text-[#22C55E] ring-[#22C55E]/30"
    : data.riding === "CAUTION"
    ? "bg-[#F59E0B]/10 text-[#F59E0B] ring-[#F59E0B]/30"
    : "bg-[#EF4444]/10 text-[#EF4444] ring-[#EF4444]/30";
  const rainProb = data.cond.toLowerCase().includes("rain") ? 80 : data.cond.toLowerCase().includes("cloud") ? 30 : 8;
  const aqi = 42;

  return (
    <Card className="p-0">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]/20">
            <Icon size={24} className="text-[#3B82F6]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums text-white">{data.temp}</span>
              <span className="text-base text-[#94A3B8]">°C</span>
            </div>
            <div className="text-xs text-[#94A3B8]">{data.cond} • {data.location}</div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ${ridingClass}`}>
          {data.riding}
        </span>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[#1f2937] border-t border-[#1f2937]">
        <WeatherStat icon={CloudDrizzle} label="Rain" value={`${rainProb}%`} />
        <WeatherStat icon={Wind} label="Wind" value={`${data.wind}`} unit="km/h" />
        <WeatherStat icon={Droplets} label="Humidity" value={`${data.humidity}%`} />
        <WeatherStat icon={Thermometer} label="AQI" value={`${aqi}`} />
      </div>
      <div className="flex items-center justify-between border-t border-[#1f2937] px-5 py-3">
        <div className="flex gap-3">
          {data.forecast.map((f, i) => {
            const FI = iconMap[f.icon] ?? Sun;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <FI size={12} className="text-[#94A3B8]" />
                <span className="text-xs tabular-nums text-white">{f.temp}°</span>
              </div>
            );
          })}
        </div>
        <button onClick={onRefresh} className="text-[10px] font-semibold uppercase tracking-wider text-[#3B82F6]">Refresh</button>
      </div>
    </Card>
  );
}

function WeatherStat({ icon: Icon, label, value, unit }: { icon: typeof Wind; label: string; value: string; unit?: string }) {
  return (
    <div className="p-3 text-center">
      <Icon size={14} className="mx-auto text-[#64748B]" />
      <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-white">
        {value}{unit && <span className="ml-0.5 text-[10px] font-medium text-[#94A3B8]">{unit}</span>}
      </div>
    </div>
  );
}

/* ============================================================
   RIDE STATS GRID (modern QuickStats)
============================================================ */
export function QuickStats({ totalDistance, lastRide, totalRides, odometer }: { totalDistance: number; lastRide: number; totalRides: number; odometer: number }) {
  const items = [
    { label: "Today", value: lastRide.toFixed(1), unit: "km", icon: NavIcon },
    { label: "Ride Time", value: "00:00", unit: "h", icon: Gauge },
    { label: "Avg Speed", value: "0", unit: "km/h", icon: Bike },
    { label: "Top Speed", value: "0", unit: "km/h", icon: Wind },
  ];
  void totalDistance; void totalRides; void odometer;
  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="card-mn p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">{s.label}</span>
              <Icon size={14} className="text-[#64748B]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums text-white">{s.value}</span>
              <span className="text-xs font-medium text-[#94A3B8]">{s.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   ALERTS
============================================================ */
export function AlertBanner({ title, desc, onDismiss, onAction, actionLabel }: { title: string; desc: string; onDismiss: () => void; onAction?: () => void; actionLabel?: string }) {
  return (
    <div className="mx-5 mt-2 flex items-start gap-3 rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/5 p-4 animate-slide-down">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/15">
        <AlertTriangle size={16} className="text-[#F59E0B]" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-0.5 text-xs text-[#94A3B8]">{desc}</div>
        {onAction && actionLabel && (
          <button onClick={onAction} className="mt-2.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white">{actionLabel}</button>
        )}
      </div>
      <button onClick={onDismiss} className="text-[#64748B] hover:text-white"><X size={16} /></button>
    </div>
  );
}

/* ============================================================
   TIP CAROUSEL
============================================================ */
export function TipCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SAFETY_TIPS.length), 8000);
    return () => clearInterval(t);
  }, []);
  return (
    <Card className="flex items-start gap-3 border-l-2 border-l-[#3B82F6]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6]/10">
        <ShieldCheck size={16} className="text-[#3B82F6]" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Safety Tip</div>
        <div key={i} className="mt-0.5 text-sm text-white animate-fade-in-up">{SAFETY_TIPS[i]}</div>
      </div>
    </Card>
  );
}

/* ============================================================
   RECENT RIDES
============================================================ */
export function RecentRidesList({ rides, onStart }: { rides: Ride[]; onStart: () => void }) {
  if (rides.length === 0) {
    return (
      <div className="px-5">
        <div className="card-mn flex flex-col items-center p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/10">
            <NavIcon size={26} className="text-[#3B82F6]" />
          </div>
          <div className="mt-3 text-base font-semibold text-white">No rides yet</div>
          <div className="mt-1 text-xs text-[#94A3B8]">Start your first ride to track your journey.</div>
          <button onClick={onStart} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]">
            <Play size={14} /> Start Ride
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2.5 px-5">
      {rides.slice(0, 3).map((r) => {
        const score = Math.min(99, 70 + Math.round(r.avgSpeed / 4));
        return (
          <button key={r.id} className="card-mn w-full p-4 text-left transition-all duration-200 active:scale-[0.99] hover:bg-[#1E2735]">
            <div className="flex items-start gap-3">
              {/* Mini route preview */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#0F1620] ring-1 ring-[#1f2937]">
                <svg viewBox="0 0 56 56" className="absolute inset-0">
                  <path d="M4 44 Q 18 30, 26 32 T 52 12" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <circle cx="4" cy="44" r="3" fill="#22C55E" />
                  <circle cx="52" cy="12" r="3" fill="#EF4444" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="truncate text-sm font-semibold text-white">{r.end}</div>
                  <div className="ml-2 flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#22C55E]">
                    <CheckCircle2 size={10} /> {score}
                  </div>
                </div>
                <div className="mt-0.5 text-[11px] text-[#64748B]">{new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-xs tabular-nums text-white"><b className="font-semibold">{r.distance.toFixed(1)}</b> <span className="text-[#94A3B8]">km</span></span>
                  <span className="text-xs tabular-nums text-white"><b className="font-semibold">{r.durationMin}</b> <span className="text-[#94A3B8]">min</span></span>
                  <span className="text-xs tabular-nums text-white"><b className="font-semibold">{r.avgSpeed}</b> <span className="text-[#94A3B8]">km/h</span></span>
                </div>
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-[#64748B]" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { SectionTitle };
