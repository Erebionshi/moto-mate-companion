import { type ReactNode } from "react";
import { LayoutDashboard, Navigation, Bike, Bluetooth, User } from "lucide-react";

export type TabKey = "dashboard" | "navigate" | "vehicle" | "iot" | "settings";

export const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "navigate", label: "Navigation", icon: Navigation },
  { key: "vehicle", label: "Vehicle", icon: Bike },
  { key: "iot", label: "Device", icon: Bluetooth },
  { key: "settings", label: "Profile", icon: User },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-[#1f2937] bg-[#0B0F14]/95 backdrop-blur-xl">
      <ul className="grid grid-cols-5 px-2 pb-2 pt-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <li key={t.key}>
              <button
                onClick={() => onChange(t.key)}
                className={`group flex w-full flex-col items-center gap-1 rounded-2xl py-2 transition-all duration-200 ${
                  isActive ? "text-white" : "text-[#64748B] hover:text-[#94A3B8]"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <div className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive ? "bg-[#3B82F6]/15 text-[#3B82F6]" : ""
                }`}>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.15 : 0} />
                </div>
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? "text-white" : ""}`}>{t.label}</span>
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
    <div className="mb-3 mt-6 flex items-end justify-between px-5">
      <h2 className="text-[15px] font-semibold tracking-tight text-white">{children}</h2>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card-mn p-4 ${className}`}>{children}</div>;
}

export function StatusDot({ on, color = "success" }: { on: boolean; color?: "success" | "primary" | "danger" }) {
  const c = on ? (color === "primary" ? "bg-[#3B82F6]" : color === "danger" ? "bg-[#EF4444]" : "bg-[#22C55E]") : "bg-[#334155]";
  return <span className={`inline-block h-2 w-2 rounded-full ${c} ${on ? "animate-ble-breath" : ""}`} />;
}
