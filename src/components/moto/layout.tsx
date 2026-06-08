import { type ReactNode } from "react";
import { Gauge, Navigation, Bike, Bluetooth, Settings as SettingsIcon } from "lucide-react";

export type TabKey = "dashboard" | "navigate" | "vehicle" | "iot" | "settings";

export const TABS: { key: TabKey; label: string; icon: typeof Gauge }[] = [
  { key: "dashboard", label: "Dashboard", icon: Gauge },
  { key: "navigate", label: "Navigate", icon: Navigation },
  { key: "vehicle", label: "Vehicle", icon: Bike },
  { key: "iot", label: "Device", icon: Bluetooth },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-[#141414] bg-[#050505]/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <li key={t.key}>
              <button
                onClick={() => onChange(t.key)}
                className={`flex w-full flex-col items-center gap-1 py-3 transition-all duration-200 ${
                  isActive ? "text-white" : "text-[#555555]"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="font-display text-[10px] tracking-widest">{t.label.toUpperCase()}</span>
                <span className={`h-0.5 w-6 rounded-full transition-all ${isActive ? "bg-white glow-white" : "bg-transparent"}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="min-h-screen pb-28 pt-2 animate-fade-in-up">{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between px-4">
      <h2 className="font-display text-xs font-bold tracking-[0.2em] text-white">{children}</h2>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card-mn p-4 ${className}`}>{children}</div>;
}

export function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        on ? "bg-white animate-ble-breath" : "bg-[#222]"
      }`}
    />
  );
}
