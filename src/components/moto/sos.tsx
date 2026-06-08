import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Phone, MapPin, X, PhoneCall, Plus, Trash2, FileWarning } from "lucide-react";
import { toast } from "sonner";
import type { Incident, Settings, SosContact, Vehicle } from "@/lib/moto/types";
import { uid } from "@/lib/moto/store";

export function SosFloatingButton({ onOpen, holdEnabled, primaryPhone }: { onOpen: () => void; holdEnabled: boolean; primaryPhone?: string }) {
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDown() {
    if (!holdEnabled || !primaryPhone) return;
    holdRef.current = setTimeout(() => {
      window.location.href = `tel:${primaryPhone}`;
    }, 2000);
  }
  function handleUp() {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
  }

  return (
    <button
      onClick={onOpen}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
      className="fixed bottom-24 right-4 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-red-600 text-white animate-sos-pulse"
      aria-label="Open SOS"
    >
      <span className="font-display text-[10px] font-bold tracking-widest">SOS</span>
    </button>
  );
}

export function SosModal({
  open, onClose, contacts, setContacts, settings, vehicle, incidents, setIncidents,
}: {
  open: boolean;
  onClose: () => void;
  contacts: SosContact[];
  setContacts: (c: SosContact[]) => void;
  settings: Settings;
  vehicle?: Vehicle;
  incidents: Incident[];
  setIncidents: (i: Incident[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rel, setRel] = useState("Family");
  const [showReport, setShowReport] = useState(false);
  const [iType, setIType] = useState("Breakdown");
  const [iNotes, setINotes] = useState("");

  useEffect(() => { if (!open) { setShowAdd(false); setShowReport(false); } }, [open]);

  if (!open) return null;
  const primary = contacts[0];

  function add() {
    if (!name || !phone) return;
    setContacts([...contacts, { id: uid(), name, phone, relationship: rel }].slice(0, 5));
    setName(""); setPhone(""); setRel("Family"); setShowAdd(false);
    toast.success("Contact added");
  }

  function copyLocation() {
    const text = `${settings.emergencyMessage} ${settings.city} — ${new Date().toLocaleString()}`;
    navigator.clipboard?.writeText(text);
    toast.success("Location copied to clipboard");
  }

  function saveIncident() {
    setIncidents([{ id: uid(), type: iType, notes: iNotes, ts: Date.now(), location: settings.city }, ...incidents].slice(0, 20));
    setINotes(""); setShowReport(false);
    toast.success("Incident reported");
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#030303]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[430px] px-4 pb-12 pt-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-600/15 p-2 ring-1 ring-red-600/50">
              <AlertTriangle className="text-red-500" size={28} />
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-red-500">EMERGENCY</div>
              <div className="text-xs text-[#777]">{settings.city} • {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md border border-[#1c1c1c] p-2 text-white"><X size={18} /></button>
        </div>

        {/* Primary contact */}
        {primary ? (
          <div className="mt-6 card-mn p-4 border-red-900/60">
            <div className="text-[10px] font-display tracking-widest text-red-400">PRIMARY CONTACT</div>
            <div className="mt-1 text-xl font-display text-white">{primary.name}</div>
            <div className="text-sm text-[#888]">{primary.relationship} • {primary.phone}</div>
            <a href={`tel:${primary.phone}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-display font-bold text-white">
              <PhoneCall size={18} /> CALL NOW
            </a>
          </div>
        ) : (
          <div className="mt-6 card-mn p-4 text-center text-sm text-[#888]">
            No primary contact yet. Add one below.
          </div>
        )}

        {/* Quick actions grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href="tel:911" className="card-mn flex flex-col items-center justify-center gap-1 p-4">
            <Phone size={22} />
            <div className="font-display font-bold">CALL 911</div>
            <div className="text-[10px] text-[#777]">PH Emergency</div>
          </a>
          <a href="tel:8888" className="card-mn flex flex-col items-center justify-center gap-1 p-4">
            <Phone size={22} />
            <div className="font-display font-bold">CALL 8888</div>
            <div className="text-[10px] text-[#777]">Nat'l Hotline</div>
          </a>
          <button onClick={copyLocation} className="card-mn flex flex-col items-center justify-center gap-1 p-4">
            <MapPin size={22} />
            <div className="font-display font-bold">COPY LOC</div>
            <div className="text-[10px] text-[#777]">Share location</div>
          </button>
          <button onClick={() => setShowReport(!showReport)} className="card-mn flex flex-col items-center justify-center gap-1 p-4">
            <FileWarning size={22} />
            <div className="font-display font-bold">REPORT</div>
            <div className="text-[10px] text-[#777]">Log incident</div>
          </button>
        </div>

        {/* Emergency Info Card */}
        <div className="mt-6 card-mn p-4">
          <div className="text-[10px] font-display tracking-widest text-[#777]">EMERGENCY INFO</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-[10px] text-[#666]">NAME</div><div className="text-white">{settings.riderName}</div></div>
            <div><div className="text-[10px] text-[#666]">BLOOD TYPE</div><div className="text-white">{settings.bloodType}</div></div>
            <div className="col-span-2"><div className="text-[10px] text-[#666]">MEDICAL NOTES</div><div className="text-white">{settings.medicalNotes || "—"}</div></div>
            <div><div className="text-[10px] text-[#666]">PLATE</div><div className="text-white">{vehicle?.plate ?? "—"}</div></div>
            <div><div className="text-[10px] text-[#666]">VEHICLE</div><div className="text-white">{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</div></div>
          </div>
        </div>

        {/* Report Form */}
        {showReport && (
          <div className="mt-4 card-mn p-4 animate-slide-down">
            <div className="font-display text-sm tracking-widest">REPORT INCIDENT</div>
            <select className="input-mn mt-3 w-full px-3 py-2" value={iType} onChange={(e) => setIType(e.target.value)}>
              {["Accident", "Breakdown", "Medical", "Theft", "Other"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <textarea className="input-mn mt-2 w-full px-3 py-2 text-sm" rows={3} placeholder="Notes…" value={iNotes} onChange={(e) => setINotes(e.target.value)} />
            <button onClick={saveIncident} className="mt-2 w-full rounded-lg bg-white py-2 text-sm font-bold text-black">SAVE</button>
          </div>
        )}

        {/* Recent incidents */}
        {incidents.length > 0 && (
          <div className="mt-4">
            <div className="px-1 font-display text-[10px] tracking-widest text-[#777]">RECENT INCIDENTS</div>
            <div className="mt-2 space-y-2">
              {incidents.slice(0, 5).map((i) => (
                <div key={i.id} className="card-mn p-3 text-sm">
                  <div className="flex justify-between"><span className="font-display">{i.type}</span><span className="text-[10px] text-[#666]">{new Date(i.ts).toLocaleDateString()}</span></div>
                  {i.notes && <div className="mt-1 text-[#888]">{i.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contacts list */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-1">
            <div className="font-display text-[10px] tracking-widest text-[#777]">EMERGENCY CONTACTS ({contacts.length}/5)</div>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 text-xs text-white"><Plus size={14} /> ADD</button>
          </div>
          {showAdd && (
            <div className="mt-2 card-mn p-3 space-y-2 animate-slide-down">
              <input className="input-mn w-full px-3 py-2 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input-mn w-full px-3 py-2 text-sm" placeholder="Phone (e.g. +63...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <select className="input-mn w-full px-3 py-2 text-sm" value={rel} onChange={(e) => setRel(e.target.value)}>
                {["Family", "Friend", "Mechanic", "Doctor"].map((r) => <option key={r}>{r}</option>)}
              </select>
              <button onClick={add} className="w-full rounded-lg bg-white py-2 text-sm font-bold text-black">SAVE CONTACT</button>
            </div>
          )}
          <div className="mt-2 space-y-2">
            {contacts.map((c, i) => (
              <div key={c.id} className="card-mn flex items-center justify-between p-3">
                <div>
                  <div className="font-display text-sm">{c.name} {i === 0 && <span className="ml-1 rounded-sm bg-red-900/40 px-1 py-0.5 text-[9px] text-red-300">PRIMARY</span>}</div>
                  <div className="text-xs text-[#777]">{c.relationship} • {c.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:${c.phone}`} className="rounded-md bg-white p-2 text-black"><Phone size={14} /></a>
                  <button onClick={() => setContacts(contacts.filter((x) => x.id !== c.id))} className="rounded-md border border-[#1c1c1c] p-2 text-[#888]"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
