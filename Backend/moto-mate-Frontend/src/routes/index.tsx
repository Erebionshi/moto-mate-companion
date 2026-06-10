import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { BottomNav, Card, Screen, SectionTitle, type TabKey } from "@/components/moto/layout";
import {
  AlertBanner, QuickActions, QuickStats, RecentRidesList, RideScoreGauge, SpeedHero, TipCarousel, TopBar, WeatherCard,
} from "@/components/moto/dashboard-bits";
import {
  ChecklistModal, NavigationView, SAMPLE_WAYPOINTS, SavedRoutesList,
} from "@/components/moto/navigate-bits";
import {
  AIChatSection, AddVehicleModal, BikeLogSection, EmptyGarage, FuelLogSection, MaintenanceList, VehicleCard,
} from "@/components/moto/vehicle-bits";
import { MapWidget } from "@/components/moto/map-widget";
import { IoTPanel } from "@/components/moto/iot-panel";
import { SosFloatingButton, SosModal } from "@/components/moto/sos";
import { uid, useBLE, useMotoStore, useServiceStatus, useWeather, useRideScore } from "@/lib/moto/store";
import type { Ride, SavedRoute, Vehicle } from "@/lib/moto/types";
import { DEFAULT_SETTINGS } from "@/lib/moto/data";
import { apiClient, type PlaceResult } from "@/lib/api/client";
import { Play, Plus, MapPin, ChevronRight, Navigation, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MotoNav — Motorcycle Companion" },
      { name: "description", content: "Premium motorcycle dashboard with navigation, maintenance, IoT control, and SOS — all offline-first." },
      { property: "og:title", content: "MotoNav" },
      { property: "og:description", content: "Premium motorcycle dashboard, maintenance tracker, IoT navigator and SOS." },
    ],
  }),
  component: MotoNavApp,
});

function MotoNavApp() {
  const store = useMotoStore();
  const ble = useBLE();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [sosOpen, setSosOpen] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [navActive, setNavActive] = useState(false);
  const [destination, setDestination] = useState("");
  const [recentDest, setRecentDest] = useLocalRecent();
  const [pendingDistance, setPendingDistance] = useState(0);
  const [checklistDoneTodayKey, setChecklistDoneTodayKey] = useState<string | null>(null);

  // ── Real maps / GPS ────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [destLocation, setDestLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [osrmWaypoints, setOsrmWaypoints] = useState<typeof SAMPLE_WAYPOINTS | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; durationMin: number } | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GPS — request once on mount, then watch continuously + capture bearing
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 10000 };
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLocation([p.coords.latitude, p.coords.longitude]),
      () => {},
      opts
    );
    const wid = navigator.geolocation.watchPosition(
      (p) => {
        setUserLocation([p.coords.latitude, p.coords.longitude]);
        // GPS bearing — only available when moving
        if (p.coords.heading != null && p.coords.heading >= 0) {
          setUserHeading(p.coords.heading);
        }
      },
      () => {},
      opts
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // Device compass — fills in heading when stationary
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const oe = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (oe.webkitCompassHeading != null) {
        // iOS: direct compass heading, 0 = North
        setUserHeading(oe.webkitCompassHeading);
      } else if (oe.absolute && oe.alpha != null) {
        // Android absolute: convert to compass heading
        setUserHeading((360 - oe.alpha) % 360);
      }
    };
    window.addEventListener("deviceorientationabsolute", handler, true);
    window.addEventListener("deviceorientation", handler, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handler, true);
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, []);

  const vehicle = store.activeVehicle;
  const statuses = useServiceStatus(vehicle, store.maintenance);
  const weather = useWeather(store.settings.weatherLocation, userLocation);
  const overdueCount = statuses.filter((s) => s.status === "OVERDUE").length;
  const dueSoonCount = statuses.filter((s) => s.status === "DUE SOON").length;
  const ride = useRideScore({
    overdueCount,
    checklistDoneToday: checklistDoneTodayKey === new Date().toDateString(),
    weatherRiding: weather.riding,
    fuelOk: true,
    tireRecent: store.rides.length > 0,
  });

  const totalDistance = useMemo(() => store.rides.reduce((a, r) => a + r.distance, 0), [store.rides]);
  const lastRide = store.rides[0]?.distance ?? 0;

  function saveVehicle(v: Vehicle) {
    if (editVehicle) {
      store.setVehicles(store.vehicles.map((x) => (x.id === v.id ? v : x)));
      setEditVehicle(null);
      toast.success("Vehicle updated");
    } else {
      store.setVehicles([...store.vehicles, v]);
      store.setActiveIdx(store.vehicles.length);
      toast.success("Vehicle added");
    }
    setShowAddVehicle(false);
  }

  function deleteVehicle(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    store.setVehicles(store.vehicles.filter((v) => v.id !== id));
    store.setActiveIdx(0);
    toast.success("Vehicle removed");
  }

  function markServiceDone(key: string) {
    if (!vehicle) return;
    const next = { ...store.maintenance, [vehicle.id]: { ...(store.maintenance[vehicle.id] ?? {}), [key]: vehicle.odometer } };
    store.setMaintenance(next);
    toast.success("Service logged");
  }

  // ── Destination search (Nominatim) ──────────────────────────────────────────
  function handleDestChange(value: string) {
    setDestination(value);
    setDestLocation(null);
    setRouteGeometry([]);
    setOsrmWaypoints(null);
    setRouteInfo(null);
    if (!value.trim()) { setSearchResults([]); setShowResults(false); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const { results } = await apiClient.places.search(value);
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch { setSearchResults([]); }
      finally { setLoadingSearch(false); }
    }, 420);
  }

  async function selectPlace(place: PlaceResult) {
    setDestination(place.name);
    setDestLocation({ lat: place.lat, lng: place.lng, name: place.name });
    setSearchResults([]);
    setShowResults(false);
    if (userLocation) {
      setLoadingRoute(true);
      try {
        const result = await apiClient.places.route({
          originLat: userLocation[0], originLng: userLocation[1],
          destLat: place.lat, destLng: place.lng,
        });
        setRouteGeometry(result.geometry);
        setOsrmWaypoints(result.waypoints);
        setRouteInfo({ distance: result.distance, durationMin: result.durationMin });
      } catch { toast.error("Route unavailable — check your connection"); }
      finally { setLoadingRoute(false); }
    }
  }

  // iOS 13+ gates compass events behind a permission prompt that may only be
  // triggered from a user gesture — call it from the START RIDE tap
  function requestCompassPermission() {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof D.requestPermission === "function") D.requestPermission().catch(() => {});
  }

  function startRide(distance = 0) {
    if (!vehicle) { toast.error("Add a vehicle first"); setTab("vehicle"); return; }
    requestCompassPermission();
    const dist = routeInfo ? parseFloat(routeInfo.distance) : distance;
    if (dist > store.settings.longRideThreshold && store.settings.checklistReminder) {
      setPendingDistance(dist);
      setShowChecklist(true);
      return;
    }
    setNavActive(true);
    setTab("navigate");
  }

  function endRide(summary: { distance: number; durationMin: number; avgSpeed: number; maxSpeed: number }) {
    const newRide: Ride = {
      id: uid(),
      date: new Date().toISOString(),
      start: store.settings.city,
      end: destination || "Custom Route",
      distance: summary.distance,
      durationMin: summary.durationMin,
      avgSpeed: summary.avgSpeed,
      maxSpeed: summary.maxSpeed,
      weather: weather.cond,
      vehicleId: vehicle?.id,
    };
    store.setRides([newRide, ...store.rides]);
    if (vehicle) {
      const updated = { ...vehicle, odometer: vehicle.odometer + Math.round(summary.distance) };
      store.setVehicles(store.vehicles.map((v) => (v.id === vehicle.id ? updated : v)));
    }
    if (destination) setRecentDest([destination, ...recentDest.filter((d) => d !== destination)].slice(0, 5));
    setNavActive(false);
    setDestination("");
    setDestLocation(null);
    setRouteGeometry([]);
    setOsrmWaypoints(null);
    setRouteInfo(null);
    toast.success(`Ride saved — ${summary.distance.toFixed(1)} km`);
  }

  // Active alerts
  const alerts = useMemo(() => {
    const list: { id: string; title: string; desc: string }[] = [];
    if (vehicle) {
      statuses.filter((s) => s.status === "OVERDUE").slice(0, 2).forEach((s) =>
        list.push({ id: `overdue-${s.key}`, title: `${s.name.toUpperCase()} OVERDUE`, desc: `${Math.abs(s.remaining).toLocaleString()} km past due — service recommended.` })
      );
      statuses.filter((s) => s.status === "DUE SOON").slice(0, 1).forEach((s) =>
        list.push({ id: `due-${s.key}`, title: `${s.name.toUpperCase()} DUE SOON`, desc: `${s.remaining.toLocaleString()} km until next service.` })
      );
    }
    if (weather.riding === "AVOID") list.push({ id: "weather", title: "WEATHER WARNING", desc: `${weather.cond} — consider postponing your ride.` });
    return list.filter((a) => !store.dismissedAlerts.includes(a.id));
  }, [vehicle, statuses, weather, store.dismissedAlerts]);

  function dismissAlert(id: string) {
    store.setDismissedAlerts([...store.dismissedAlerts, id]);
  }

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-[#0B0F14]">
      {tab === "dashboard" && (
        <Screen>
          <TopBar bleConnected={ble.state === "CONNECTED"} vehicle={vehicle} />
          <div className="space-y-4 px-5">
            <SpeedHero speed={navActive ? 42 : 0} trip={lastRide} time="00:00" avg={navActive ? 38 : 0} />
            <QuickActions
              onStartRide={() => setTab("navigate")}
              onNavigateHome={() => { setDestination("Home"); setTab("navigate"); }}
              onFindVehicle={() => toast.success("Locating vehicle…")}
              onEmergency={() => setSosOpen(true)}
            />
            <RideScoreGauge score={ride.score} issues={ride.issues} />
            <WeatherCard data={weather} onRefresh={weather.refresh} />
          </div>
          {alerts.length > 0 && (
            <>
              <SectionTitle>Active Alerts</SectionTitle>
              {alerts.map((a) => (
                <AlertBanner key={a.id} title={a.title} desc={a.desc} onDismiss={() => dismissAlert(a.id)} />
              ))}
            </>
          )}
          <SectionTitle>Ride Statistics</SectionTitle>
          <QuickStats totalDistance={totalDistance} lastRide={lastRide} totalRides={store.rides.length} odometer={vehicle?.odometer ?? 0} />
          <SectionTitle right={<button onClick={() => setTab("navigate")} className="text-xs font-medium text-[#3B82F6]">View all</button>}>Recent Rides</SectionTitle>
          <RecentRidesList rides={store.rides} onStart={() => startRide(0)} />
          <SectionTitle>Safety</SectionTitle>
          <div className="px-5"><TipCarousel /></div>
          <div className="px-5 pt-6">
            <button onClick={() => setTab("navigate")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] py-4 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-[0.99] transition">
              <Navigation size={18} /> Plan a Ride
            </button>
          </div>
        </Screen>
      )}

      {/* ── Full-screen navigation overlay (Google Maps style) ──────────────── */}
      {navActive && tab === "navigate" && (
        <div className="fixed inset-y-0 left-0 right-0 z-50 mx-auto w-full max-w-[430px] overflow-hidden">
          <NavigationView
            waypoints={osrmWaypoints ?? SAMPLE_WAYPOINTS}
            onEnd={endRide}
            bleConnected={ble.state === "CONNECTED"}
            sendBle={ble.send}
            speedLimit={store.settings.speedLimit}
            speedLimitEnabled={store.settings.speedLimitEnabled}
            userLocation={userLocation}
            destination={destLocation}
            routeGeometry={routeGeometry}
            userHeading={userHeading}
          />
        </div>
      )}

      {tab === "navigate" && !navActive && (
        <Screen>
          <TopBar bleConnected={ble.state === "CONNECTED"} vehicle={vehicle} />
          <>
              <div className="space-y-2 px-4">
                {/* Destination search input + Nominatim results dropdown */}
                <div className="relative">
                  <div className="relative">
                    <input
                      className="input-mn w-full px-3 py-3 pr-9 text-sm"
                      placeholder="Where are you going?"
                      value={destination}
                      onChange={(e) => handleDestChange(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowResults(true)}
                      onBlur={() => setTimeout(() => setShowResults(false), 150)}
                    />
                    {loadingSearch && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 size={14} className="animate-spin text-[#555]" />
                      </div>
                    )}
                  </div>

                  {showResults && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 overflow-hidden rounded-b-lg border border-t-0 border-[#1c1c1c] bg-[#0e1218] shadow-2xl">
                      {searchResults.map((place) => (
                        <button
                          key={place.id}
                          onMouseDown={() => selectPlace(place)}
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-white/5 active:bg-white/10"
                        >
                          <MapPin size={14} className="mt-0.5 shrink-0 text-[#555]" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">{place.name}</div>
                            <div className="truncate text-[11px] text-[#555]">{place.fullName}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick-pick chips */}
                <div className="flex flex-wrap gap-2">
                  {["Home", "Work", "Gas Station", "Mechanic"].map((c) => (
                    <button key={c} onClick={() => handleDestChange(c)} className="rounded-full border border-[#1c1c1c] px-3 py-1 text-xs text-[#bbb] hover:border-[#333] hover:text-white transition">{c}</button>
                  ))}
                </div>

                {/* Recent destinations */}
                {!showResults && recentDest.length > 0 && (
                  <div className="card-mn p-2 text-xs">
                    <div className="mb-1 px-1 font-display text-[10px] tracking-widest text-[#777]">RECENT</div>
                    {recentDest.map((d) => (
                      <button key={d} onClick={() => handleDestChange(d)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-white/5">
                        <span className="flex items-center gap-2"><MapPin size={12} className="text-[#666]" />{d}</span>
                        <ChevronRight size={12} className="text-[#555]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Route info banner — appears once OSRM route is calculated */}
              {routeInfo && (
                <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-[#1c1c1c] bg-[#0e1a10] px-3 py-2.5 text-sm animate-slide-down">
                  <Navigation size={16} className="shrink-0 text-[#4ade80]" />
                  <span className="text-[#4ade80] font-display text-xs tracking-wider">
                    {routeInfo.distance} km · {routeInfo.durationMin} min via OSRM
                  </span>
                </div>
              )}

              {loadingRoute && (
                <div className="mx-4 mt-2 flex items-center gap-2 text-[11px] text-[#555]">
                  <Loader2 size={12} className="animate-spin" /> Calculating route…
                </div>
              )}

              {/* Live map preview */}
              <div className="px-4 mt-3">
                <MapWidget
                  userLocation={userLocation}
                  destination={destLocation}
                  routeGeometry={routeGeometry}
                  height="h-52"
                />
              </div>

              {weather.riding === "AVOID" && (
                <div className="card-mn mx-4 mt-3 border-l-2 border-l-red-700 p-3 text-sm text-red-300 animate-slide-down">
                  ⚠ RAIN DETECTED — reduce speed, increase following distance, check tire pressure.
                </div>
              )}

              <SectionTitle>SAVED ROUTES</SectionTitle>
              <SavedRoutesList
                routes={store.routes}
                onStart={(r) => { setDestination(r.end); startRide(r.distance); }}
                onToggleFav={(id) => store.setRoutes(store.routes.map((x) => x.id === id ? { ...x, favorite: !x.favorite } : x))}
                onDelete={(id) => store.setRoutes(store.routes.filter((x) => x.id !== id))}
              />

            </>
        </Screen>
      )}

      {/* ── Sticky "GO" bar — visible on navigate tab without scrolling ─────── */}
      {tab === "navigate" && !navActive && (
        <div className="fixed bottom-14 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-4 pb-2">
          <button
            disabled={loadingRoute}
            onClick={() => {
              if (!destination) { toast.error("Enter a destination first"); return; }
              startRide(routeInfo ? parseFloat(routeInfo.distance) : Math.round(Math.random() * 60) + 5);
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display font-bold text-sm shadow-2xl transition active:scale-[0.99] disabled:opacity-50
              ${osrmWaypoints ? "bg-[#3B82F6] text-white shadow-[#3B82F6]/30" : "bg-white text-black"}`}
          >
            {loadingRoute
              ? <><Loader2 size={16} className="animate-spin" /> CALCULATING ROUTE…</>
              : osrmWaypoints
              ? <><Navigation size={16} /> START NAVIGATION</>
              : <><Play size={16} /> SIMULATE RIDE</>
            }
          </button>
        </div>
      )}

      {tab === "vehicle" && (
        <Screen>
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div className="font-display text-lg tracking-widest">MY GARAGE</div>
            <button onClick={() => { setEditVehicle(null); setShowAddVehicle(true); }} className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-black"><Plus size={14} /> ADD</button>
          </div>
          {!vehicle ? (
            <EmptyGarage onAdd={() => setShowAddVehicle(true)} />
          ) : (
            <div className="space-y-4">
              {store.vehicles.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide">
                  {store.vehicles.map((v, i) => (
                    <button key={v.id} onClick={() => store.setActiveIdx(i)} className={`whitespace-nowrap rounded-md border px-3 py-1 text-xs font-display ${i === store.activeIdx ? "border-white bg-white text-black" : "border-[#1c1c1c] text-[#bbb]"}`}>
                      {v.nickname || v.model}
                    </button>
                  ))}
                </div>
              )}
              <div className="px-4">
                <VehicleCard vehicle={vehicle} onEdit={() => { setEditVehicle(vehicle); setShowAddVehicle(true); }} onDelete={() => deleteVehicle(vehicle.id)} />
              </div>

              {alerts.length > 0 && (
                <div className="space-y-2">
                  {alerts.slice(0, 2).map((a) => (
                    <AlertBanner key={a.id} title={a.title} desc={a.desc} onDismiss={() => dismissAlert(a.id)} />
                  ))}
                </div>
              )}

              <SectionTitle>MAINTENANCE SCHEDULE</SectionTitle>
              <MaintenanceList items={statuses} onMarkDone={markServiceDone} />

              <SectionTitle>FUEL</SectionTitle>
              <FuelLogSection vehicleId={vehicle.id} entries={store.fuel} setEntries={store.setFuel} />

              <SectionTitle>AI ASSISTANT</SectionTitle>
              <AIChatSection vehicle={vehicle} statuses={statuses} chat={store.chat} setChat={store.setChat} />

              <SectionTitle>NOTES</SectionTitle>
              <BikeLogSection vehicleId={vehicle.id} log={store.bikeLog} setLog={store.setBikeLog} />
            </div>
          )}
        </Screen>
      )}

      {tab === "iot" && (
        <Screen>
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div className="font-display text-lg tracking-widest">IOT DEVICE</div>
            <div className="flex items-center gap-2 rounded-md border border-[#141414] bg-[#080808] px-2 py-1">
              <span className={`inline-block h-2 w-2 rounded-full ${ble.state === "CONNECTED" ? "bg-white animate-ble-breath" : "bg-[#222]"}`} />
              <span className="font-display text-[10px] tracking-widest text-[#aaa]">{ble.state}</span>
            </div>
          </div>
          <IoTPanel ble={ble} />
        </Screen>
      )}

      {tab === "settings" && (
        <Screen>
          <div className="px-4 pb-3 pt-4">
            <div className="font-display text-lg tracking-widest">SETTINGS</div>
          </div>
          <SettingsScreen store={store} />
        </Screen>
      )}

      {!navActive && <BottomNav active={tab} onChange={setTab} />}
      {!navActive && <SosFloatingButton onOpen={() => setSosOpen(true)} holdEnabled={store.settings.sosHoldEnabled} primaryPhone={store.sosContacts[0]?.phone} />}
      <SosModal
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        contacts={store.sosContacts}
        setContacts={store.setSosContacts}
        settings={store.settings}
        vehicle={vehicle}
        incidents={store.incidents}
        setIncidents={store.setIncidents}
      />

      <AddVehicleModal
        open={showAddVehicle}
        onClose={() => { setShowAddVehicle(false); setEditVehicle(null); }}
        onSave={saveVehicle}
        initial={editVehicle ?? undefined}
      />

      <ChecklistModal
        open={showChecklist}
        onClose={() => setShowChecklist(false)}
        onAllClear={() => { setChecklistDoneTodayKey(new Date().toDateString()); setShowChecklist(false); setNavActive(true); setTab("navigate"); }}
        onSkip={() => { setShowChecklist(false); setNavActive(true); setTab("navigate"); }}
      />
    </div>
  );
}

function useLocalRecent() {
  const [v, setV] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("motoNav_recentDest") || "[]"); } catch { return []; }
  });
  function set(x: string[]) {
    setV(x);
    try { window.localStorage.setItem("motoNav_recentDest", JSON.stringify(x)); } catch {}
  }
  return [v, set] as const;
}

function SettingsScreen({ store }: { store: ReturnType<typeof useMotoStore> }) {
  const s = store.settings;
  const update = (patch: Partial<typeof s>) => store.setSettings({ ...s, ...patch });

  function exportData() {
    const data: Record<string, unknown> = {};
    Object.keys(localStorage).filter((k) => k.startsWith("motoNav_")).forEach((k) => {
      try { data[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch {}
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "motonav-data.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }
  function clearAll() {
    if (!confirm("Delete ALL data? This cannot be undone.")) return;
    Object.keys(localStorage).filter((k) => k.startsWith("motoNav_")).forEach((k) => localStorage.removeItem(k));
    location.reload();
  }

  return (
    <div className="space-y-4 px-4">
      <Section title="PROFILE">
        <Row label="Rider Name"><input className="input-mn w-44 px-2 py-1 text-sm" value={s.riderName} onChange={(e) => update({ riderName: e.target.value })} /></Row>
        <Row label="City"><input className="input-mn w-44 px-2 py-1 text-sm" value={s.city} onChange={(e) => update({ city: e.target.value })} /></Row>
        <Row label="Experience">
          <select className="input-mn px-2 py-1 text-sm" value={s.experience} onChange={(e) => update({ experience: e.target.value as typeof s.experience })}>
            {["Beginner", "Intermediate", "Advanced", "Expert"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Row>
      </Section>

      <Section title="APP PREFERENCES">
        <Row label="Distance"><Toggle value={s.distanceUnit === "KM"} on="KM" off="MI" onChange={(b) => update({ distanceUnit: b ? "KM" : "MI" })} /></Row>
        <Row label="Speed"><Toggle value={s.speedUnit === "KM/H"} on="KM/H" off="MPH" onChange={(b) => update({ speedUnit: b ? "KM/H" : "MPH" })} /></Row>
        <Row label={`Long ride: ${s.longRideThreshold}km`}>
          <input type="range" min={50} max={200} value={s.longRideThreshold} onChange={(e) => update({ longRideThreshold: +e.target.value })} />
        </Row>
        <Row label="Checklist reminder"><Switch value={s.checklistReminder} onChange={(b) => update({ checklistReminder: b })} /></Row>
      </Section>

      <Section title="MAINTENANCE">
        <Row label="Oil interval">
          <select className="input-mn px-2 py-1 text-sm" value={s.oilChangeInterval} onChange={(e) => update({ oilChangeInterval: +e.target.value })}>
            {[2000, 2500, 3000, 5000].map((v) => <option key={v} value={v}>{v} km</option>)}
          </select>
        </Row>
        <Row label="Notifications"><Switch value={s.maintenanceNotifs} onChange={(b) => update({ maintenanceNotifs: b })} /></Row>
        <Row label="Weather location"><input className="input-mn w-44 px-2 py-1 text-sm" value={s.weatherLocation} onChange={(e) => update({ weatherLocation: e.target.value })} /></Row>
      </Section>

      <Section title="SOS / MEDICAL">
        <Row label="Blood Type">
          <select className="input-mn px-2 py-1 text-sm" value={s.bloodType} onChange={(e) => update({ bloodType: e.target.value })}>
            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => <option key={b}>{b}</option>)}
          </select>
        </Row>
        <Row label="Hold-to-call (2s)"><Switch value={s.sosHoldEnabled} onChange={(b) => update({ sosHoldEnabled: b })} /></Row>
        <div>
          <div className="mb-1 font-display text-[10px] tracking-widest text-[#777]">MEDICAL NOTES</div>
          <textarea className="input-mn w-full px-2 py-2 text-sm" rows={2} value={s.medicalNotes} onChange={(e) => update({ medicalNotes: e.target.value })} />
        </div>
        <div>
          <div className="mb-1 font-display text-[10px] tracking-widest text-[#777]">EMERGENCY MESSAGE</div>
          <textarea className="input-mn w-full px-2 py-2 text-sm" rows={2} value={s.emergencyMessage} onChange={(e) => update({ emergencyMessage: e.target.value })} />
        </div>
      </Section>

      <Section title="SAFETY">
        <Row label="Speed alerts"><Switch value={s.speedLimitEnabled} onChange={(b) => update({ speedLimitEnabled: b })} /></Row>
        <Row label={`Limit: ${s.speedLimit} km/h`}>
          <input type="range" min={40} max={120} value={s.speedLimit} onChange={(e) => update({ speedLimit: +e.target.value })} />
        </Row>
      </Section>

      <Section title="DATA">
        <Row label="Total rides"><span className="font-display text-sm">{store.rides.length}</span></Row>
        <Row label="Total distance"><span className="font-display text-sm">{store.rides.reduce((a, r) => a + r.distance, 0).toFixed(0)} km</span></Row>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={exportData} className="rounded-md border border-[#1c1c1c] py-2 text-xs font-display">EXPORT</button>
          <button onClick={() => { store.setSettings(DEFAULT_SETTINGS); toast.success("Settings reset"); }} className="rounded-md border border-[#1c1c1c] py-2 text-xs font-display">RESET SETTINGS</button>
        </div>
        <button onClick={clearAll} className="mt-2 w-full rounded-md border border-red-900/60 py-2 text-xs font-display text-red-400">CLEAR ALL DATA</button>
      </Section>

      <Section title="ABOUT">
        <Row label="Version"><span className="font-display text-sm">1.0.0</span></Row>
        <Row label="Stack"><span className="font-display text-sm">React + TS</span></Row>
        <Row label="IoT"><span className="font-display text-sm">ESP32-S3 + GC9A01</span></Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-mn p-4">
      <div className="mb-3 font-display text-[10px] tracking-widest text-[#777]">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between text-sm"><span className="text-[#bbb]">{label}</span>{children}</div>;
}
function Toggle({ value, on, off, onChange }: { value: boolean; on: string; off: string; onChange: (b: boolean) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-[#1c1c1c]">
      <button onClick={() => onChange(true)} className={`px-2 py-1 text-xs font-display ${value ? "bg-white text-black" : "text-[#aaa]"}`}>{on}</button>
      <button onClick={() => onChange(false)} className={`px-2 py-1 text-xs font-display ${!value ? "bg-white text-black" : "text-[#aaa]"}`}>{off}</button>
    </div>
  );
}
function Switch({ value, onChange }: { value: boolean; onChange: (b: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-white" : "bg-[#1a1a1a]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full transition ${value ? "left-5 bg-black" : "left-0.5 bg-[#555]"}`} />
    </button>
  );
}
