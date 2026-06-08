import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BottomNav, Card, Screen, SectionTitle, type TabKey } from "@/components/moto/layout";
import {
  AlertBanner, QuickStats, RecentRidesList, RideScoreGauge, SpeedHero, TipCarousel, TopBar, WeatherCard,
} from "@/components/moto/dashboard-bits";
import {
  ChecklistModal, NavigationView, SAMPLE_WAYPOINTS, SavedRoutesList,
} from "@/components/moto/navigate-bits";
import {
  AIChatSection, AddVehicleModal, BikeLogSection, EmptyGarage, FuelLogSection, MaintenanceList, VehicleCard,
} from "@/components/moto/vehicle-bits";
import { IoTPanel } from "@/components/moto/iot-panel";
import { SosFloatingButton, SosModal } from "@/components/moto/sos";
import { uid, useBLE, useMotoStore, useServiceStatus, useWeather, useRideScore } from "@/lib/moto/store";
import type { Ride, SavedRoute, Vehicle } from "@/lib/moto/types";
import { DEFAULT_SETTINGS } from "@/lib/moto/data";
import { Play, Plus, MapPin, ChevronRight } from "lucide-react";

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

  const vehicle = store.activeVehicle;
  const statuses = useServiceStatus(vehicle, store.maintenance);
  const weather = useWeather(store.settings.weatherLocation);
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

  function startRide(distance = 0) {
    if (!vehicle) { toast.error("Add a vehicle first"); setTab("vehicle"); return; }
    if (distance > store.settings.longRideThreshold && store.settings.checklistReminder) {
      setPendingDistance(distance);
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
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#030303]">
      {tab === "dashboard" && (
        <Screen>
          <TopBar bleConnected={ble.state === "CONNECTED"} vehicle={vehicle} />
          <div className="space-y-3 px-4">
            <SpeedHero speed={navActive ? 42 : 0} trip={lastRide} time="00:00" avg={navActive ? 38 : 0} />
            <WeatherCard data={weather} onRefresh={weather.refresh} />
            <RideScoreGauge score={ride.score} issues={ride.issues} />
          </div>
          <QuickStats totalDistance={totalDistance} lastRide={lastRide} totalRides={store.rides.length} odometer={vehicle?.odometer ?? 0} />
          {alerts.length > 0 && (
            <>
              <SectionTitle>ACTIVE ALERTS</SectionTitle>
              {alerts.map((a) => (
                <AlertBanner key={a.id} title={a.title} desc={a.desc} onDismiss={() => dismissAlert(a.id)} />
              ))}
            </>
          )}
          <SectionTitle>RECENT RIDES</SectionTitle>
          <RecentRidesList rides={store.rides} onStart={() => startRide(0)} />
          <SectionTitle>SAFETY</SectionTitle>
          <div className="px-4"><TipCarousel /></div>
          <div className="px-4 pt-6">
            <button onClick={() => startRide(0)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-display font-bold text-black">
              <Play size={18} /> START RIDE
            </button>
          </div>
        </Screen>
      )}

      {tab === "navigate" && (
        <Screen>
          <TopBar bleConnected={ble.state === "CONNECTED"} vehicle={vehicle} />
          {!navActive ? (
            <>
              <div className="space-y-2 px-4">
                <input
                  className="input-mn w-full px-3 py-3 text-sm"
                  placeholder="Where are you going?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {["Home", "Work", "Gas Station", "Mechanic"].map((c) => (
                    <button key={c} onClick={() => setDestination(c)} className="rounded-full border border-[#1c1c1c] px-3 py-1 text-xs text-[#bbb]">{c}</button>
                  ))}
                </div>
                {recentDest.length > 0 && (
                  <div className="card-mn p-2 text-xs">
                    <div className="mb-1 px-1 font-display text-[10px] tracking-widest text-[#777]">RECENT</div>
                    {recentDest.map((d) => (
                      <button key={d} onClick={() => setDestination(d)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-white/5">
                        <span className="flex items-center gap-2"><MapPin size={12} className="text-[#666]" />{d}</span>
                        <ChevronRight size={12} className="text-[#555]" />
                      </button>
                    ))}
                  </div>
                )}
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

              <div className="px-4 pt-6">
                <button
                  onClick={() => {
                    if (!destination) { toast.error("Enter a destination"); return; }
                    startRide(Math.round(Math.random() * 60) + 5);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-display font-bold text-black"
                >
                  <Play size={16} /> SIMULATE RIDE
                </button>
              </div>
            </>
          ) : (
            <NavigationView
              waypoints={SAMPLE_WAYPOINTS}
              onEnd={endRide}
              bleConnected={ble.state === "CONNECTED"}
              sendBle={ble.send}
              speedLimit={store.settings.speedLimit}
              speedLimitEnabled={store.settings.speedLimitEnabled}
            />
          )}
        </Screen>
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

      <BottomNav active={tab} onChange={setTab} />
      <SosFloatingButton onOpen={() => setSosOpen(true)} holdEnabled={store.settings.sosHoldEnabled} primaryPhone={store.sosContacts[0]?.phone} />
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
