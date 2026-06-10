import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { DEFAULT_SETTINGS, PRESET_ROUTES, getScheduleForBrand } from "./data";
import type {
  BikeLogEntry, ChatMsg, FuelEntry, Incident, Maintenance, Ride, SavedRoute,
  Settings, SosContact, Vehicle,
} from "./types";

export function useMotoStore() {
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>("motoNav_vehicles", []);
  const [activeIdx, setActiveIdx] = useLocalStorage<number>("motoNav_activeVehicle", 0);
  const [rides, setRides] = useLocalStorage<Ride[]>("motoNav_rideHistory", []);
  const [fuel, setFuel] = useLocalStorage<FuelEntry[]>("motoNav_fuelLog", []);
  const [maintenance, setMaintenance] = useLocalStorage<Maintenance>("motoNav_maintenance", {});
  const [settings, setSettings] = useLocalStorage<Settings>("motoNav_settings", DEFAULT_SETTINGS);
  const [sosContacts, setSosContacts] = useLocalStorage<SosContact[]>("motoNav_sosContacts", []);
  const [bikeLog, setBikeLog] = useLocalStorage<BikeLogEntry[]>("motoNav_bikeLog", []);
  const [routes, setRoutes] = useLocalStorage<SavedRoute[]>("motoNav_savedRoutes", PRESET_ROUTES);
  const [chat, setChat] = useLocalStorage<ChatMsg[]>("motoNav_chatHistory", []);
  const [incidents, setIncidents] = useLocalStorage<Incident[]>("motoNav_incidents", []);
  const [dismissedAlerts, setDismissedAlerts] = useLocalStorage<string[]>("motoNav_alerts", []);

  const activeVehicle: Vehicle | undefined = vehicles[activeIdx] ?? vehicles[0];

  return {
    vehicles, setVehicles,
    activeIdx, setActiveIdx,
    activeVehicle,
    rides, setRides,
    fuel, setFuel,
    maintenance, setMaintenance,
    settings, setSettings,
    sosContacts, setSosContacts,
    bikeLog, setBikeLog,
    routes, setRoutes,
    chat, setChat,
    incidents, setIncidents,
    dismissedAlerts, setDismissedAlerts,
  };
}

export type ServiceStatus = {
  key: string;
  name: string;
  icon: string;
  interval: number;
  months?: number;
  lastDone: number;
  nextDue: number;
  remaining: number;
  progress: number; // 0..1
  status: "OVERDUE" | "DUE SOON" | "OK";
};

export function useServiceStatus(vehicle: Vehicle | undefined, maintenance: Maintenance): ServiceStatus[] {
  return useMemo(() => {
    if (!vehicle) return [];
    const schedule = getScheduleForBrand(vehicle.brand, vehicle.driveType ?? "belt");
    const recs = maintenance[vehicle.id] ?? {};
    return schedule.map((s) => {
      const lastDone = recs[s.key] ?? 0;
      const interval = s.interval || 5000;
      const nextDue = lastDone + interval;
      const remaining = nextDue - vehicle.odometer;
      const progress = Math.min(1, Math.max(0, (vehicle.odometer - lastDone) / interval));
      let status: ServiceStatus["status"] = "OK";
      if (remaining <= 0) status = "OVERDUE";
      else if (remaining <= 500) status = "DUE SOON";
      return { key: s.key, name: s.name, icon: s.icon, interval: s.interval, months: s.months, lastDone, nextDue, remaining, progress, status };
    });
  }, [vehicle, maintenance]);
}

export function useWeather(location: string, gpsCoords?: [number, number] | null) {
  const [tick, setTick] = useState(0);
  const localData = useMemo(() => {
    const h = new Date().getHours();
    let temp = 28, cond = "Clear", icon = h > 5 && h < 18 ? "Sun" : "Moon";
    if (h >= 5 && h < 11) { temp = 24; cond = "Partly Cloudy"; icon = "Cloud"; }
    else if (h >= 11 && h < 15) { temp = 32; }
    else if (h >= 15 && h < 19) { temp = 28; cond = "Partly Cloudy"; icon = "Cloud"; }
    else { temp = 22; }
    const wind = 8 + ((tick * 3 + h) % 12);
    const humidity = 55 + ((tick * 7 + h) % 30);
    const riding = cond.includes("Rain") ? "AVOID" as const : cond === "Windy" || cond === "Cloudy" ? "CAUTION" as const : "GOOD" as const;
    return { temp, cond, icon, wind, humidity, riding, location, forecast: [
      { t: "+1h", temp: temp + 1, icon },
      { t: "+2h", temp, icon },
      { t: "+3h", temp: temp - 1, icon: "Cloud" },
    ]};
  }, [location, tick]);

  // Use GPS coords when available — gives weather for your actual location, not a saved city name.
  // Re-fetch when GPS changes by more than ~500m (round to 2 decimal places ≈ 1.1km grid).
  const coordKey = gpsCoords
    ? `${gpsCoords[0].toFixed(2)},${gpsCoords[1].toFixed(2)}`
    : null;

  const query = useQuery({
    queryKey: ["weather", coordKey ?? location],
    queryFn: () => apiClient.weather.get(location || "Manila", gpsCoords ?? null),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    query.refetch();
    setTick((x) => x + 1);
  }, [query]);

  if (query.data) return { ...query.data, refresh };
  return { ...localData, refresh };
}

export function useRideScore(args: { overdueCount: number; checklistDoneToday: boolean; weatherRiding: string; fuelOk: boolean; tireRecent: boolean }) {
  let score = 0;
  const issues: string[] = [];
  if (args.overdueCount === 0) score += 40; else issues.push(`${args.overdueCount} overdue service item(s)`);
  if (args.tireRecent) score += 15; else issues.push("Tire pressure not recently checked");
  if (args.fuelOk) score += 15; else issues.push("Fuel level low");
  if (args.weatherRiding === "GOOD") score += 15; else issues.push(`Weather: ${args.weatherRiding}`);
  if (args.checklistDoneToday) score += 15; else issues.push("Pre-ride checklist not completed today");
  return { score, issues };
}

export type BleLogEntry = { ts: number; dir: "SENT" | "RECV"; payload: string };
export function useBLE() {
  const [state, setState] = useState<"DISCONNECTED" | "SCANNING" | "FOUND" | "CONNECTED">("DISCONNECTED");
  const [log, setLog] = useState<BleLogEntry[]>([]);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [screen, setScreen] = useState<"NAV" | "MUSIC" | "BRIGHT" | "STATS">("NAV");
  const [brightness, setBrightness] = useState(80);

  function scan() {
    setState("SCANNING");
    setTimeout(() => setState("FOUND"), 2000);
  }
  function connect() {
    setState("CONNECTED");
    setConnectedAt(Date.now());
    send({ type: "INIT" });
  }
  function disconnect() {
    setState("DISCONNECTED");
    setConnectedAt(null);
  }
  function send(payload: object) {
    setLog((l) => [{ ts: Date.now(), dir: "SENT" as const, payload: JSON.stringify(payload) }, ...l].slice(0, 20));
  }
  function recv(payload: object) {
    setLog((l) => [{ ts: Date.now(), dir: "RECV" as const, payload: JSON.stringify(payload) }, ...l].slice(0, 20));
  }
  function clearLog() { setLog([]); }

  return { state, log, connectedAt, screen, setScreen, brightness, setBrightness, scan, connect, disconnect, send, recv, clearLog };
}

export function useToday() {
  const [today] = useState(() => new Date().toDateString());
  return today;
}

// helper id
export function uid() { return Math.random().toString(36).slice(2, 10); }

// km recent threshold for tire check
export function useTireRecent(rides: Ride[]) {
  const last = rides[0];
  if (!last) return false;
  return (Date.now() - new Date(last.date).getTime()) < 7 * 24 * 3600 * 1000;
}

// dummy fuel-ok using last fuel entry
export function useFuelOk(fuel: FuelEntry[]) {
  return fuel.length > 0 ? true : true; // assume OK by default
}

// effect hook reused as no-op for SSR safety re-exports
export { useEffect };
