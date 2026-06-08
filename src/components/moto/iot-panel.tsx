import { useState } from "react";
import { Bluetooth, BluetoothSearching, RefreshCw, Power, Sun, Music2, Zap, BarChart3, ArrowUp, ArrowLeft, ArrowRight, CornerDownLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Card, StatusDot } from "./layout";
import type { useBLE } from "@/lib/moto/store";

type BLE = ReturnType<typeof useBLE>;

export function IoTPanel({ ble }: { ble: BLE }) {
  const [showLog, setShowLog] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  if (ble.state === "DISCONNECTED") {
    return (
      <div className="space-y-4 px-4">
        <Card>
          <div className="flex flex-col items-center py-6">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-[#1c1c1c] bg-[#050505]">
              <Bluetooth size={36} className="text-[#444]" />
            </div>
            <div className="mt-4 font-display text-lg">No Device Connected</div>
            <div className="text-xs text-[#777]">Pair your MotoNav IoT device to unlock controls</div>
            <button onClick={ble.scan} className="mt-4 rounded-lg bg-white px-6 py-3 font-display font-bold text-black">SCAN FOR DEVICE</button>
          </div>
        </Card>
        <Card>
          <button onClick={() => setHelpOpen(!helpOpen)} className="flex w-full items-center justify-between font-display text-xs tracking-widest text-[#aaa]">
            HOW TO PAIR {helpOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {helpOpen && (
            <ol className="mt-3 space-y-1 text-xs text-[#aaa] animate-slide-down">
              <li>1. Power on your ESP32 device</li>
              <li>2. Enable Bluetooth on your phone</li>
              <li>3. Tap "Scan for Device" above</li>
              <li>4. Select "MotoNav" from the list</li>
              <li>5. Wait for confirmation — done!</li>
            </ol>
          )}
        </Card>
      </div>
    );
  }

  if (ble.state === "SCANNING" || ble.state === "FOUND") {
    return (
      <div className="space-y-4 px-4">
        <Card>
          <div className="flex flex-col items-center py-8">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-white/30 animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full border border-white/30 animate-pulse-ring" style={{ animationDelay: "0.6s" }} />
              <div className="absolute inset-0 rounded-full border border-white/30 animate-pulse-ring" style={{ animationDelay: "1.2s" }} />
              <BluetoothSearching className="text-white" size={32} />
            </div>
            <div className="mt-4 font-display text-sm">Scanning for MotoNav device…</div>
            <div className="mt-1 text-xs text-[#666]">• • •</div>
          </div>
        </Card>
        {ble.state === "FOUND" && (
          <div className="space-y-2 animate-fade-in-up">
            <button onClick={ble.connect} className="card-mn flex w-full items-center justify-between p-3 hover:border-white/40">
              <div className="text-left">
                <div className="font-display text-sm">MotoNav</div>
                <div className="text-[11px] text-[#777]">ESP32-S3</div>
              </div>
              <div className="font-display text-[10px] tracking-widest text-white">████ TAP TO CONNECT</div>
            </button>
            <div className="card-mn flex w-full items-center justify-between p-3 opacity-50">
              <div className="text-left">
                <div className="font-display text-sm">Unknown Device</div>
                <div className="text-[11px] text-[#777]">—</div>
              </div>
              <div className="font-display text-[10px] tracking-widest text-[#666]">██░░</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // CONNECTED
  const screenButtons = [
    { key: "NAV" as const, icon: ArrowUp, label: "NAV" },
    { key: "MUSIC" as const, icon: Music2, label: "MUSIC" },
    { key: "BRIGHT" as const, icon: Sun, label: "BRIGHT" },
    { key: "STATS" as const, icon: BarChart3, label: "STATS" },
  ];

  return (
    <div className="space-y-3 px-4">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot on />
            <span className="font-display text-xs tracking-widest text-white">CONNECTED</span>
          </div>
          <button onClick={ble.disconnect} className="rounded-md border border-[#1c1c1c] px-2 py-1 text-[10px] font-display tracking-widest text-[#aaa]"><Power size={10} className="mr-1 inline" />DISCONNECT</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#141414] pt-3 text-xs">
          <div><div className="text-[9px] text-[#666]">DEVICE</div><div>MotoNav</div></div>
          <div><div className="text-[9px] text-[#666]">CHIP</div><div>ESP32-S3 Mini</div></div>
          <div className="col-span-2 truncate"><div className="text-[9px] text-[#666]">SVC UUID</div><div className="text-[#aaa]">12345678-1234-1234-1234-1234567890ab</div></div>
          <div className="col-span-2 truncate"><div className="text-[9px] text-[#666]">CHAR UUID</div><div className="text-[#aaa]">abcdefab-cdef-abcd-efab-cdefabcdefab</div></div>
          <div><div className="text-[9px] text-[#666]">SIGNAL</div><div>████</div></div>
          <div><div className="text-[9px] text-[#666]">CONNECTED</div><div>{ble.connectedAt ? new Date(ble.connectedAt).toLocaleTimeString() : "—"}</div></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {/* Screen mode */}
        <Card>
          <div className="font-display text-[10px] tracking-widest text-[#777]">SCREEN MODE</div>
          <div className="mt-1 text-xs">Current: <span className="font-display text-white">{ble.screen}</span></div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {screenButtons.map((b) => (
              <button
                key={b.key}
                onClick={() => { ble.setScreen(b.key); ble.send({ type: "SCREEN", value: b.key }); }}
                className={`rounded-md py-2 text-[10px] font-display ${ble.screen === b.key ? "bg-white text-black" : "bg-[#0f0f0f] text-[#aaa]"}`}
              >{b.label}</button>
            ))}
          </div>
        </Card>

        {/* Brightness */}
        <Card>
          <div className="font-display text-[10px] tracking-widest text-[#777]">BRIGHTNESS</div>
          <div className="mt-1 text-xs">Level: <span className="font-display text-white">{ble.brightness}%</span></div>
          <div className="mt-2 flex gap-1">
            {[20, 40, 60, 80, 100].map((lvl) => (
              <button key={lvl} onClick={() => { ble.setBrightness(lvl); ble.send({ type: "BRIGHT", value: lvl }); }} className={`h-6 flex-1 rounded-sm ${ble.brightness >= lvl ? "bg-white" : "bg-[#1a1a1a]"}`} />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            <button onClick={() => { const v = Math.max(0, ble.brightness - 20); ble.setBrightness(v); ble.send({ type: "BRIGHT", value: v }); }} className="rounded-md border border-[#1c1c1c] px-2 py-1 text-[10px]">−</button>
            <button onClick={() => { const v = Math.min(100, ble.brightness + 20); ble.setBrightness(v); ble.send({ type: "BRIGHT", value: v }); }} className="rounded-md border border-[#1c1c1c] px-2 py-1 text-[10px]">+</button>
          </div>
        </Card>

        {/* Nav arrow preview */}
        <Card>
          <div className="font-display text-[10px] tracking-widest text-[#777]">NAV ARROW</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#1c1c1c]"><ArrowUp size={28} /></div>
            <div>
              <div className="font-display text-lg">320 M</div>
              <div className="flex items-center gap-1 text-[10px] text-[#777]"><StatusDot on /> LIVE</div>
            </div>
          </div>
        </Card>

        {/* Quick commands */}
        <Card>
          <div className="font-display text-[10px] tracking-widest text-[#777]">QUICK CMDS</div>
          <div className="mt-2 grid grid-cols-1 gap-1">
            <button onClick={() => ble.send({ type: "TEST_ARROW" })} className="rounded-md bg-[#0f0f0f] py-1.5 text-[10px] font-display">TEST ARROW</button>
            <button onClick={() => { ble.send({ type: "PING" }); setTimeout(() => ble.recv({ type: "PONG" }), 300); }} className="rounded-md bg-[#0f0f0f] py-1.5 text-[10px] font-display">SEND PING</button>
            <button onClick={() => ble.send({ type: "RESTART" })} className="rounded-md bg-[#0f0f0f] py-1.5 text-[10px] font-display">RESTART</button>
          </div>
        </Card>
      </div>

      <Card>
        <button onClick={() => setShowLog(!showLog)} className="flex w-full items-center justify-between font-display text-[10px] tracking-widest text-[#aaa]">
          {showLog ? "HIDE" : "SHOW"} BLE LOG {showLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showLog && (
          <div className="mt-3 animate-slide-down">
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md bg-[#050505] p-2 font-mono text-[10px]">
              {ble.log.length === 0 && <div className="text-[#555]">— no traffic —</div>}
              {ble.log.map((l, i) => (
                <div key={i} className={l.dir === "SENT" ? "text-white" : "text-[#888]"}>
                  <span className="text-[#555]">{new Date(l.ts).toLocaleTimeString()} </span>
                  {l.dir === "SENT" ? "▶" : "◀"} {l.payload}
                </div>
              ))}
            </div>
            <button onClick={ble.clearLog} className="mt-2 rounded-md border border-[#1c1c1c] px-2 py-1 text-[10px]">CLEAR</button>
          </div>
        )}
      </Card>

      <Card>
        <div className="font-display text-[10px] tracking-widest text-[#777]">DEVICE INFO</div>
        <div className="mt-1 text-xs text-[#aaa]">ESP32-S3 Mini + GC9A01 1.28" round display + 5 buttons</div>
        <div className="mt-1 text-[11px] text-[#666]">Build guide & schematics → see project docs</div>
      </Card>
    </div>
  );
}
