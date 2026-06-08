import { useMemo, useState } from "react";
import * as Lucide from "lucide-react";
import { Card } from "./layout";
import { BRANDS, COLOR_SWATCHES, ENGINES, QUICK_QUESTIONS, aiAnswer } from "@/lib/moto/data";
import { uid, type ServiceStatus } from "@/lib/moto/store";
import type { BikeLogEntry, ChatMsg, FuelEntry, Maintenance, Vehicle } from "@/lib/moto/types";
import { toast } from "sonner";

const { Plus, X, Edit2, Trash2, Fuel, MessageCircle, Send, NotebookPen } = Lucide;

function getIcon(name: string) {
  const I = (Lucide as any)[name] ?? Lucide.Wrench;
  return I as typeof Lucide.Wrench;
}

export function VehicleCard({ vehicle, onEdit, onDelete }: { vehicle: Vehicle; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="card-mn relative overflow-hidden px-4 py-4">
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: vehicle.color || "#fff" }} />
      <div className="ml-2 flex items-start justify-between">
        <div>
          <div className="font-display text-xl">{vehicle.nickname || vehicle.model}</div>
          <div className="text-xs text-[#888]">{vehicle.brand} {vehicle.model} • {vehicle.year}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="rounded-md border border-[#1c1c1c] p-2 text-[#aaa]"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="rounded-md border border-[#1c1c1c] p-2 text-[#aaa]"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="ml-2 mt-3 grid grid-cols-4 gap-2 border-t border-[#141414] pt-3 text-center">
        <div><div className="text-[9px] text-[#666]">ODO</div><div className="font-display text-sm">{vehicle.odometer.toLocaleString()}</div></div>
        <div><div className="text-[9px] text-[#666]">YEAR</div><div className="font-display text-sm">{vehicle.year}</div></div>
        <div><div className="text-[9px] text-[#666]">ENGINE</div><div className="font-display text-sm">{vehicle.engine}</div></div>
        <div><div className="text-[9px] text-[#666]">PLATE</div><div className="font-display text-sm">{vehicle.plate || "—"}</div></div>
      </div>
    </div>
  );
}

export function AddVehicleModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (v: Vehicle) => void; initial?: Vehicle }) {
  const [v, setV] = useState<Vehicle>(
    initial ?? { id: uid(), brand: "Yamaha", model: "", year: 2023, engine: "155cc", odometer: 0, plate: "", nickname: "", color: "#ffffff", driveType: "belt" }
  );
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030303]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[430px] px-4 pb-12 pt-8">
        <div className="flex items-start justify-between">
          <div className="font-display text-xl tracking-widest">{initial ? "EDIT VEHICLE" : "ADD VEHICLE"}</div>
          <button onClick={onClose} className="rounded-md border border-[#1c1c1c] p-2"><X size={16} /></button>
        </div>
        <div className="mt-4 space-y-2">
          <Field label="BRAND"><select className="input-mn w-full px-3 py-2" value={v.brand} onChange={(e) => setV({ ...v, brand: e.target.value })}>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="MODEL"><input className="input-mn w-full px-3 py-2" value={v.model} onChange={(e) => setV({ ...v, model: e.target.value })} placeholder="e.g. NMAX 155" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="YEAR"><select className="input-mn w-full px-3 py-2" value={v.year} onChange={(e) => setV({ ...v, year: +e.target.value })}>{Array.from({ length: 16 }, (_, i) => 2025 - i).map((y) => <option key={y}>{y}</option>)}</select></Field>
            <Field label="ENGINE"><select className="input-mn w-full px-3 py-2" value={v.engine} onChange={(e) => setV({ ...v, engine: e.target.value })}>{ENGINES.map((e) => <option key={e}>{e}</option>)}</select></Field>
          </div>
          <Field label="ODOMETER (km)"><input type="number" className="input-mn w-full px-3 py-2" value={v.odometer} onChange={(e) => setV({ ...v, odometer: +e.target.value })} /></Field>
          <Field label="LICENSE PLATE"><input className="input-mn w-full px-3 py-2" value={v.plate} onChange={(e) => setV({ ...v, plate: e.target.value })} /></Field>
          <Field label="NICKNAME"><input className="input-mn w-full px-3 py-2" value={v.nickname} onChange={(e) => setV({ ...v, nickname: e.target.value })} placeholder="My Daily" /></Field>
          <Field label="DRIVE TYPE">
            <div className="flex gap-2">
              {(["belt", "chain", "shaft"] as const).map((d) => (
                <button key={d} onClick={() => setV({ ...v, driveType: d })} className={`flex-1 rounded-md border px-2 py-2 text-xs font-display ${v.driveType === d ? "border-white bg-white text-black" : "border-[#1c1c1c] text-[#aaa]"}`}>{d.toUpperCase()}</button>
              ))}
            </div>
          </Field>
          <Field label="COLOR">
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button key={c} onClick={() => setV({ ...v, color: c })} className={`h-8 w-8 rounded-full border-2 ${v.color === c ? "border-white" : "border-[#1c1c1c]"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </Field>
          <button onClick={() => { if (!v.model) { toast.error("Model required"); return; } onSave(v); }} className="mt-4 w-full rounded-lg bg-white py-3 font-display font-bold text-black">SAVE VEHICLE</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[10px] tracking-widest text-[#777]">{label}</span>
      {children}
    </label>
  );
}

export function MaintenanceList({ items, onMarkDone }: { items: ServiceStatus[]; onMarkDone: (key: string) => void }) {
  return (
    <div className="space-y-2 px-4">
      {items.map((s) => {
        const Icon = getIcon(s.icon);
        const badge = s.status === "OVERDUE" ? "border-white text-white" : s.status === "DUE SOON" ? "border-[#888] text-[#bbb]" : "border-[#222] text-[#555]";
        return (
          <div key={s.key} className="card-mn p-3">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-[#0f0f0f] p-2"><Icon size={16} /></div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-sm">{s.name}</div>
                    <div className="text-[11px] text-[#888]">{s.interval > 0 ? `Every ${s.interval.toLocaleString()} km` : `Every ${s.months} months`}{s.months && s.interval > 0 ? ` or ${s.months} mo` : ""}</div>
                  </div>
                  <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-display tracking-widest ${badge}`}>{s.status}</span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#141414]">
                  <div className="h-full bg-white transition-all duration-700" style={{ width: `${Math.round(s.progress * 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[#777]">
                  <span>Last: {s.lastDone.toLocaleString()} km</span>
                  <span>{s.remaining > 0 ? `${s.remaining.toLocaleString()} km left` : `${Math.abs(s.remaining).toLocaleString()} km over`}</span>
                </div>
                <button onClick={() => onMarkDone(s.key)} className="mt-2 rounded-md border border-[#1c1c1c] px-2 py-1 text-[10px] font-display tracking-widest text-white hover:bg-white/5">MARK AS DONE</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FuelLogSection({ vehicleId, entries, setEntries }: { vehicleId: string; entries: FuelEntry[]; setEntries: (e: FuelEntry[]) => void }) {
  const [show, setShow] = useState(false);
  const [liters, setLiters] = useState(4);
  const [price, setPrice] = useState(65);
  const [odo, setOdo] = useState(0);
  const [station, setStation] = useState("");
  const [full, setFull] = useState(true);

  const my = useMemo(() => entries.filter((e) => e.vehicleId === vehicleId).sort((a, b) => +new Date(b.date) - +new Date(a.date)), [entries, vehicleId]);
  const stats = useMemo(() => {
    if (my.length < 2) return null;
    const fulls = my.filter((e) => e.fullTank);
    if (fulls.length < 2) return null;
    const recent = fulls.slice(0, 5);
    let kmTotal = 0, lTotal = 0, costTotal = 0;
    for (let i = 0; i < recent.length - 1; i++) {
      const km = recent[i].odometer - recent[i + 1].odometer;
      if (km > 0) { kmTotal += km; lTotal += recent[i].liters; costTotal += recent[i].liters * recent[i].pricePerLiter; }
    }
    const kmPerL = lTotal > 0 ? kmTotal / lTotal : 0;
    return { kmPerL: kmPerL.toFixed(1), costPerKm: kmTotal > 0 ? (costTotal / kmTotal).toFixed(2) : "0.00", total: entries.reduce((a, e) => a + e.liters * e.pricePerLiter, 0).toFixed(0) };
  }, [my, entries]);

  function save() {
    setEntries([{ id: uid(), vehicleId, date: new Date().toISOString(), liters, pricePerLiter: price, odometer: odo, station, fullTank: full }, ...entries]);
    setShow(false); setLiters(4); setStation("");
    toast.success("Fuel logged");
  }

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-xs tracking-widest text-white">FUEL LOG</div>
        <button onClick={() => setShow(!show)} className="flex items-center gap-1 text-xs text-white"><Plus size={14} /> ADD</button>
      </div>
      {show && (
        <div className="card-mn mb-3 space-y-2 p-3 animate-slide-down">
          <div className="grid grid-cols-2 gap-2">
            <Field label="LITERS"><input type="number" className="input-mn w-full px-2 py-2" value={liters} onChange={(e) => setLiters(+e.target.value)} /></Field>
            <Field label="₱/L"><input type="number" className="input-mn w-full px-2 py-2" value={price} onChange={(e) => setPrice(+e.target.value)} /></Field>
          </div>
          <Field label="ODOMETER"><input type="number" className="input-mn w-full px-2 py-2" value={odo} onChange={(e) => setOdo(+e.target.value)} /></Field>
          <Field label="STATION (optional)"><input className="input-mn w-full px-2 py-2" value={station} onChange={(e) => setStation(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> Full tank</label>
          <button onClick={save} className="w-full rounded-lg bg-white py-2 text-sm font-bold text-black">SAVE</button>
        </div>
      )}
      {stats && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Card><div className="text-center"><div className="text-[9px] text-[#666]">KM/L</div><div className="font-display text-base">{stats.kmPerL}</div></div></Card>
          <Card><div className="text-center"><div className="text-[9px] text-[#666]">₱/KM</div><div className="font-display text-base">₱{stats.costPerKm}</div></div></Card>
          <Card><div className="text-center"><div className="text-[9px] text-[#666]">TOTAL ₱</div><div className="font-display text-base">{stats.total}</div></div></Card>
        </div>
      )}
      <div className="space-y-2">
        {my.length === 0 && <div className="card-mn p-4 text-center text-xs text-[#777]"><Fuel className="mx-auto mb-1 text-[#444]" size={20} />No fuel entries yet</div>}
        {my.slice(0, 5).map((e) => (
          <div key={e.id} className="card-mn flex items-center justify-between p-3 text-xs">
            <div>
              <div className="font-display">{e.liters} L • ₱{(e.liters * e.pricePerLiter).toFixed(0)}</div>
              <div className="text-[10px] text-[#777]">{new Date(e.date).toLocaleDateString()} • ODO {e.odometer.toLocaleString()} {e.station ? ` • ${e.station}` : ""}</div>
            </div>
            {e.fullTank && <span className="rounded-sm border border-[#1c1c1c] px-1.5 py-0.5 text-[9px] tracking-widest text-[#aaa]">FULL</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIChatSection({ vehicle, statuses, chat, setChat }: { vehicle: Vehicle; statuses: ServiceStatus[]; chat: ChatMsg[]; setChat: (m: ChatMsg[]) => void }) {
  const [input, setInput] = useState("");
  const ctx = {
    brand: vehicle.brand,
    model: vehicle.model,
    overdue: statuses.filter((s) => s.status === "OVERDUE").map((s) => s.name),
    dueSoon: statuses.filter((s) => s.status === "DUE SOON").map((s) => s.name),
  };
  function ask(q: string) {
    if (!q.trim()) return;
    const userMsg: ChatMsg = { id: uid(), role: "user", text: q, ts: Date.now() };
    const botMsg: ChatMsg = { id: uid(), role: "bot", text: aiAnswer(q, ctx), ts: Date.now() + 1 };
    setChat([...chat, userMsg, botMsg].slice(-20));
    setInput("");
  }
  return (
    <div className="px-4">
      <div className="mb-2 flex items-center gap-2 font-display text-xs tracking-widest">
        <MessageCircle size={14} /> ASK ABOUT YOUR {(vehicle.nickname || vehicle.model || "BIKE").toUpperCase()}
      </div>
      <div className="card-mn p-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full border border-[#1c1c1c] px-2 py-1 text-[10px] text-[#bbb] hover:bg-white/5">{q}</button>
          ))}
        </div>
        {chat.length > 0 && (
          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
            {chat.slice().reverse().slice(0, 10).reverse().map((m) => (
              <div key={m.id} className={`rounded-md p-2 text-xs ${m.role === "user" ? "bg-white/10 text-white" : "bg-[#0a0a0a] text-[#ddd]"}`}>
                <div className="whitespace-pre-line">{m.text}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input className="input-mn flex-1 px-3 py-2 text-sm" placeholder="Ask about your motorcycle…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)} />
          <button onClick={() => ask(input)} className="rounded-md bg-white px-3 text-black"><Send size={14} /></button>
        </div>
      </div>
    </div>
  );
}

export function BikeLogSection({ vehicleId, log, setLog }: { vehicleId: string; log: BikeLogEntry[]; setLog: (l: BikeLogEntry[]) => void }) {
  const [cat, setCat] = useState("Oil");
  const [text, setText] = useState("");
  const my = log.filter((l) => l.vehicleId === vehicleId).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const cats = ["Oil", "Tires", "Brakes", "Engine", "Electrical", "Other"];
  function add() {
    if (!text.trim()) return;
    setLog([{ id: uid(), vehicleId, date: new Date().toISOString(), category: cat, text }, ...log]);
    setText("");
    toast.success("Note added");
  }
  return (
    <div className="px-4">
      <div className="mb-2 flex items-center gap-2 font-display text-xs tracking-widest"><NotebookPen size={14} /> BIKE LOG</div>
      <div className="card-mn p-3">
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-2 py-1 text-[10px] ${cat === c ? "border-white bg-white text-black" : "border-[#1c1c1c] text-[#bbb]"}`}>{c}</button>
          ))}
        </div>
        <textarea className="input-mn mt-2 w-full px-2 py-2 text-sm" rows={2} placeholder="Note…" value={text} onChange={(e) => setText(e.target.value)} />
        <button onClick={add} className="mt-2 w-full rounded-lg bg-white py-2 text-xs font-bold text-black">ADD NOTE</button>
        <div className="mt-3 space-y-2">
          {my.slice(0, 8).map((n) => (
            <div key={n.id} className="flex items-start gap-2 border-t border-[#0f0f0f] pt-2 text-xs">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
              <div className="flex-1">
                <div className="text-[10px] text-[#777]">{n.category} • {new Date(n.date).toLocaleDateString()}</div>
                <div className="text-[#ddd]">{n.text}</div>
              </div>
            </div>
          ))}
          {my.length === 0 && <div className="py-3 text-center text-xs text-[#666]">No entries</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyGarage({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card-mn mx-4 p-8 text-center">
      <Lucide.Bike size={36} className="mx-auto text-[#444]" />
      <div className="mt-3 font-display text-lg">Your garage is empty</div>
      <div className="mt-1 text-xs text-[#888]">Add your first motorcycle to track maintenance and rides.</div>
      <button onClick={onAdd} className="mt-4 rounded-md bg-white px-4 py-2 text-xs font-bold text-black">ADD VEHICLE</button>
    </div>
  );
}
