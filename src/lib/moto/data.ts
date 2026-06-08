import type { SavedRoute, Settings } from "./types";

export const BRANDS = ["Yamaha", "Honda", "Kawasaki", "Suzuki", "KTM", "BMW", "Ducati", "Royal Enfield", "TVS", "Bajaj", "CFMoto", "Rusi", "Other"];
export const ENGINES = ["110cc", "125cc", "150cc", "155cc", "200cc", "250cc", "300cc", "400cc", "500cc+"];
export const COLOR_SWATCHES = ["#0a0a0a", "#ffffff", "#dc2626", "#1d4ed8", "#9ca3af", "#f97316", "#16a34a"];

export const DEFAULT_SETTINGS: Settings = {
  riderName: "Rider",
  city: "Taguig, NCR",
  experience: "Intermediate",
  distanceUnit: "KM",
  speedUnit: "KM/H",
  longRideThreshold: 100,
  checklistReminder: true,
  oilChangeInterval: 2500,
  maintenanceNotifs: true,
  weatherLocation: "Taguig, NCR",
  bloodType: "O+",
  medicalNotes: "",
  speedLimitEnabled: true,
  speedLimit: 60,
  sosHoldEnabled: true,
  emergencyMessage: "EMERGENCY — I need help. My location:",
};

export type MaintItem = {
  key: string;
  name: string;
  interval: number; // km, 0 = time-based
  months?: number;
  icon: string; // lucide name
  chainOnly?: boolean;
};

const baseSchedule: MaintItem[] = [
  { key: "oil", name: "Engine Oil Change", interval: 2500, months: 3, icon: "Droplets" },
  { key: "oilFilter", name: "Oil Filter", interval: 5000, icon: "Filter" },
  { key: "airClean", name: "Air Filter Clean", interval: 4000, icon: "Wind" },
  { key: "airReplace", name: "Air Filter Replace", interval: 12000, icon: "Wind" },
  { key: "spark", name: "Spark Plug", interval: 8000, icon: "Zap" },
  { key: "valve", name: "Valve Clearance", interval: 12000, icon: "Wrench" },
  { key: "belt", name: "Drive Belt", interval: 20000, icon: "Circle" },
  { key: "rollers", name: "Roller Weights", interval: 20000, icon: "Circle" },
  { key: "brakeFluid", name: "Brake Fluid", interval: 0, months: 24, icon: "Droplet" },
  { key: "padsFront", name: "Brake Pads Front", interval: 15000, icon: "Disc" },
  { key: "padsRear", name: "Brake Pads Rear", interval: 15000, icon: "Disc" },
  { key: "tirePressure", name: "Tire Pressure", interval: 200, icon: "Gauge" },
  { key: "chainLube", name: "Chain Lubrication", interval: 500, icon: "Link", chainOnly: true },
  { key: "chainAdjust", name: "Chain Adjustment", interval: 1000, icon: "Link", chainOnly: true },
  { key: "coolant", name: "Coolant", interval: 0, months: 24, icon: "Thermometer" },
  { key: "battery", name: "Battery Check", interval: 0, months: 6, icon: "BatteryCharging" },
  { key: "throttle", name: "Throttle Body Clean", interval: 12000, icon: "Wrench" },
];

const overrides: Record<string, Partial<Record<string, Partial<MaintItem>>>> = {
  Honda: { spark: { interval: 6000 } },
  Kawasaki: { oil: { interval: 3000 }, spark: { interval: 6000 } },
  Suzuki: { oil: { interval: 3000 }, spark: { interval: 6000 } },
  KTM: { oil: { interval: 5000 }, spark: { interval: 10000 } },
  BMW: { oil: { interval: 10000 }, spark: { interval: 20000 } },
  Ducati: { oil: { interval: 5000 } },
};

const extras: Record<string, MaintItem[]> = {
  Ducati: [{ key: "desmo", name: "Desmodromic Valve Service", interval: 12000, icon: "Settings" }],
};

export function getScheduleForBrand(brand: string, driveType: "chain" | "belt" | "shaft" = "belt"): MaintItem[] {
  const o = overrides[brand] ?? {};
  const items = baseSchedule.map((i) => ({ ...i, ...(o[i.key] ?? {}) }));
  const filtered = items.filter((i) => !i.chainOnly || driveType === "chain");
  return [...filtered, ...(extras[brand] ?? [])];
}

export const PRESET_ROUTES: SavedRoute[] = [
  { id: "p1", name: "BGC Loop", start: "BGC", end: "BGC", distance: 12, durationMin: 25, difficulty: "Easy", turns: 14, preset: true },
  { id: "p2", name: "Coastal Road", start: "MOA", end: "Cavitex", distance: 35, durationMin: 50, difficulty: "Moderate", turns: 22, preset: true },
  { id: "p3", name: "Tagaytay Day Ride", start: "Manila", end: "Tagaytay", distance: 120, durationMin: 150, difficulty: "Long Ride", turns: 48, preset: true },
  { id: "p4", name: "Batangas Beach Run", start: "Manila", end: "Batangas", distance: 180, durationMin: 210, difficulty: "Long Ride", turns: 56, preset: true },
  { id: "p5", name: "Marikina Bikeways", start: "QC", end: "Marikina", distance: 20, durationMin: 35, difficulty: "Easy", turns: 18, preset: true },
];

export const SAFETY_TIPS = [
  "Always wear full protective gear — helmet, jacket, gloves, boots.",
  "Maintain a 3-second following distance from vehicles ahead.",
  "Check mirrors every 5–7 seconds while riding.",
  "Never ride in vehicle blind spots — stay visible.",
  "Ride sober. Alcohol impairs reaction time significantly.",
  "Bright colored gear increases visibility by 37%.",
  "Check tire pressure weekly — correct pressure prevents blowouts.",
  "Service your bike every 2,500 km to prevent breakdowns.",
];

export const CHECKLIST_ITEMS = [
  { key: "tire", title: "Tire Pressure", desc: "Check front and rear tire pressure (28–32 PSI)." },
  { key: "fuel", title: "Fuel Level", desc: "Ensure sufficient fuel for the trip + reserve." },
  { key: "oil", title: "Engine Oil", desc: "Check oil level on sight glass." },
  { key: "lights", title: "Headlights & Taillights", desc: "Test all lights are functional." },
  { key: "brakes", title: "Brakes", desc: "Test front and rear brake feel." },
  { key: "chain", title: "Chain / Belt", desc: "Check tension and lubrication." },
  { key: "mirrors", title: "Mirrors", desc: "Adjust mirrors for visibility." },
  { key: "gear", title: "Helmet & Gear", desc: "Full riding gear ready." },
  { key: "phone", title: "Phone Mounted", desc: "Navigation device secured." },
  { key: "weather", title: "Weather Check", desc: "Check forecast for route." },
];

export const QUICK_QUESTIONS = [
  "What needs service now?",
  "How do I check oil?",
  "When should I change tires?",
  "What tools do I need for oil change?",
  "Is my bike ready for a long ride?",
];

export function aiAnswer(q: string, ctx: { brand?: string; model?: string; overdue?: string[]; dueSoon?: string[] }): string {
  const t = q.toLowerCase();
  if (t.includes("needs service") || t.includes("service now")) {
    if (!ctx.overdue?.length && !ctx.dueSoon?.length) return "All maintenance items are within their service intervals. Keep riding safe.";
    const lines: string[] = [];
    if (ctx.overdue?.length) lines.push(`OVERDUE: ${ctx.overdue.join(", ")}.`);
    if (ctx.dueSoon?.length) lines.push(`Due soon: ${ctx.dueSoon.join(", ")}.`);
    return lines.join(" ");
  }
  if (t.includes("check oil") || t.includes("oil level")) {
    return `For your ${ctx.brand ?? ""} ${ctx.model ?? ""}:\n1. Park on center stand on level surface.\n2. Wait 3 minutes after engine off.\n3. Remove dipstick, wipe clean, reinsert WITHOUT screwing in.\n4. Check level between MIN and MAX marks.\n5. Use 10W-40 semi-synthetic (or factory-spec oil).`;
  }
  if (t.includes("change tires") || t.includes("tire")) {
    return "Replace tires when tread depth is below 1.6mm, you see cracks, uneven wear, or after ~15,000–20,000 km. Check pressure weekly (28–32 PSI front/rear typical).";
  }
  if (t.includes("tools")) {
    return "For oil change: drain bolt wrench (12mm or 17mm depending on model), oil filter wrench, drain pan, funnel, rags, new crush washer, and 800ml–1L of fresh oil.";
  }
  if (t.includes("long ride") || t.includes("ready")) {
    const issues = [...(ctx.overdue ?? []), ...(ctx.dueSoon ?? [])];
    if (!issues.length) return "GREEN — Bike is in good shape. Top off fuel, check tire pressure, and ride safe.";
    return `CAUTION — Address before long ride: ${issues.join(", ")}.`;
  }
  return "I can help with maintenance, oil, tires, tools, and ride readiness. Try one of the suggested questions.";
}
