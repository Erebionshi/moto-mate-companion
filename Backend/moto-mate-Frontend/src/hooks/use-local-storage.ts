import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";

// Keys that are synced to the backend. Excludes motoNav_userId (would be circular).
const SYNC_KEYS = new Set([
  "motoNav_vehicles",
  "motoNav_activeVehicle",
  "motoNav_rideHistory",
  "motoNav_fuelLog",
  "motoNav_maintenance",
  "motoNav_settings",
  "motoNav_sosContacts",
  "motoNav_bikeLog",
  "motoNav_savedRoutes",
  "motoNav_chatHistory",
  "motoNav_incidents",
  "motoNav_alerts",
]);

// Module-level debounce timers — survive React re-renders.
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleSyncToCloud(key: string, value: unknown): void {
  if (typeof window === "undefined" || !SYNC_KEYS.has(key)) return;
  const userId = window.localStorage.getItem("motoNav_userId");
  if (!userId) return;

  const prev = syncTimers.get(key);
  if (prev) clearTimeout(prev);

  syncTimers.set(
    key,
    setTimeout(async () => {
      syncTimers.delete(key);
      try {
        await apiClient.sync.save(userId, key, value);
      } catch {
        // Silently fail — offline or backend not running. Local data is safe.
      }
    }, 2000)
  );
}

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);
  // Tracks whether the last setValue came from a cloud-update event
  // so we skip syncing it back (avoids a pointless round-trip write).
  const skipNextSyncRef = useRef(false);

  // Read from localStorage on mount.
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {}
    setHydrated(true);
  }, [key]);

  // Listen for cloud-hydration events dispatched by CloudSyncInit in __root.tsx.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ key: string; value: unknown }>).detail;
      if (detail.key === key) {
        skipNextSyncRef.current = true;
        setValue(detail.value as T);
      }
    }
    window.addEventListener("motoNav:cloud-update", handler);
    return () => window.removeEventListener("motoNav:cloud-update", handler);
  }, [key]);

  // Write to localStorage and schedule a cloud sync whenever value changes.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return; // value came from cloud — skip the back-sync
    }

    scheduleSyncToCloud(key, value);
  }, [key, value, hydrated]);

  const reset = useCallback(() => setValue(defaultValue), [defaultValue]);
  return [value, setValue, reset, hydrated] as const;
}
