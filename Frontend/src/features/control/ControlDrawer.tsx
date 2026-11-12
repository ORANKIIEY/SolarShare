"use client";

import React, { useState } from "react";
import { 
  X, 
  Download, 
  Thermometer, 
  Activity, 
  Brain, 
  Scissors, 
  Truck, 
  FileText,
  Radio,
  AlertTriangle,
  Clock,
  Battery,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
}

// Mock IEEE C57.91 thermal data
const THERMAL_DATA = {
  hotSpotTemp: 112,
  topOilTemp: 78,
  windingTemp: 112,
  ambientTemp: 32,
  remainingLife: 847,
  degradationRate: 0.12, // % per hour at current load
  loadFactor: 1.24,
  ieeeLimit: 110
};

// Mock forensic payload data
const FORENSIC_DATA = {
  mqttLogSize: "2.4 MB",
  adcSamples: 10000,
  sampleRate: "200 kHz",
  duration: "50ms",
  tinymlInference: 0.96,
  fpgaBlocks: ["H2_INRUSH", "H5_NORMAL"],
  batteryVoltage: 12.4,
  lastHeartbeat: "2s ago"
};

// Topology determines available actions
const POLE_TOPOLOGY: Record<string, "isolated" | "shared"> = {
  "P-042": "isolated",
  "P-041": "shared",
  "TR-01": "isolated",
  "TR-02": "shared",
  "TR-03": "shared",
  "TR-04": "isolated",
};

export function ControlDrawer({ isOpen, onClose, nodeId }: ControlDrawerProps) {
  const [activeTab, setActiveTab] = useState<"forensics" | "thermal" | "actions">("forensics");
  
  if (!nodeId) return null;

  const topology = POLE_TOPOLOGY[nodeId] || "shared";
  const isIsolated = topology === "isolated";

  const handleDownloadMQTTLog = () => {
    // Simulate download
    const mockLog = `[${new Date().toISOString()}] Pole ${nodeId} Event Log
[14:23:05] FPGA_BLOCK: H2_INRUSH (15.2%)
[14:23:10] TINYML_DETECT: confidence=0.96
[14:23:12] THERMAL_ALERT: hotspot=112C
[14:23:15] CONTACTOR_CUT: ACK received
`;
    const blob = new Blob([mockLog], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mqtt_log_${nodeId}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadWaveform = () => {
    // Simulate CSV download of raw ADC data
    const csv = "time_us,amplitude_A\n" + 
      Array.from({ length: 100 }, (_, i) => `${i * 5},${(45 * Math.sin(i * 0.1) + Math.random()).toFixed(4)}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waveform_${nodeId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-[1200] shadow-2xl transition-transform duration-500 ease-in-out transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <div>
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Radio className="w-3 h-3" />
              Edge Device Control
            </div>
            <h2 className="text-xl font-bold text-white font-sans">Pole ID: {nodeId}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-[9px] font-mono px-2 py-0.5 rounded",
                isIsolated ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
              )}>
                {isIsolated ? "ISOLATED LOAD" : "SHARED SECONDARY"}
              </span>
              <span className="text-[9px] font-mono text-zinc-500">
                ESP32-S3 @ {FORENSIC_DATA.batteryVoltage}V
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800">
          {[
            { id: "forensics", label: "Forensics", icon: Brain },
            { id: "thermal", label: "IEEE C57.91", icon: Thermometer },
            { id: "actions", label: "Actions", icon: Activity }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-mono uppercase tracking-wider transition-colors",
                activeTab === id 
                  ? "bg-zinc-900 text-blue-400 border-b-2 border-blue-400" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-180px)] custom-scroll">
          
          {/* FORENSICS TAB */}
          {activeTab === "forensics" && (
            <>
              {/* TinyML Inference */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">TinyML Inference</h3>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-300">Theft Confidence</span>
                  <span className="text-2xl font-bold text-purple-400 font-mono">
                    {(FORENSIC_DATA.tinymlInference * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-purple-500 h-full transition-all"
                    style={{ width: `${FORENSIC_DATA.tinymlInference * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">
                  8-bit quantized neural network • Threshold: 80%
                </p>
              </section>

              {/* FPGA Block Status */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">FPGA Harmonic Blocks</h3>
                </div>
                <div className="space-y-2">
                  {FORENSIC_DATA.fpgaBlocks.map((block, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-800">
                      <span className="text-xs font-mono text-zinc-300">{block}</span>
                      <span className="text-[10px] font-mono text-green-400">ACTIVE</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-3 font-mono">
                  Prevents false positives from inrush/capacitor switching
                </p>
              </section>

              {/* Download Actions */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-green-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Forensic Payload</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleDownloadMQTTLog}
                    className="flex flex-col items-center gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-green-500/50 transition-colors"
                  >
                    <Download className="w-5 h-5 text-green-400" />
                    <span className="text-[10px] font-mono text-zinc-300">MQTT Log</span>
                    <span className="text-[9px] font-mono text-zinc-500">{FORENSIC_DATA.mqttLogSize}</span>
                  </button>
                  <button 
                    onClick={handleDownloadWaveform}
                    className="flex flex-col items-center gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-blue-500/50 transition-colors"
                  >
                    <Download className="w-5 h-5 text-blue-400" />
                    <span className="text-[10px] font-mono text-zinc-300">ADC Data</span>
                    <span className="text-[9px] font-mono text-zinc-500">{FORENSIC_DATA.duration} @ {FORENSIC_DATA.sampleRate}</span>
                  </button>
                </div>
              </section>
            </>
          )}

          {/* THERMAL TAB */}
          {activeTab === "thermal" && (
            <>
              {/* IEEE C57.91 Thermal Profile */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">IEEE C57.91 Thermal Model</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Hot-spot temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-300">Hot-Spot Temperature</span>
                      <span className={cn(
                        "text-lg font-bold font-mono",
                        THERMAL_DATA.hotSpotTemp > THERMAL_DATA.ieeeLimit ? "text-red-400" : "text-orange-400"
                      )}>
                        {THERMAL_DATA.hotSpotTemp}°C
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          THERMAL_DATA.hotSpotTemp > THERMAL_DATA.ieeeLimit ? "bg-red-500" : "bg-orange-500"
                        )}
                        style={{ width: `${Math.min((THERMAL_DATA.hotSpotTemp / 140) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                      <span>Ambient: {THERMAL_DATA.ambientTemp}°C</span>
                      <span>IEEE Limit: {THERMAL_DATA.ieeeLimit}°C</span>
                    </div>
                  </div>

                  {/* Other temperatures */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                      <div className="text-[9px] text-zinc-500 mb-1">Top Oil</div>
                      <div className="text-sm font-bold text-zinc-300 font-mono">{THERMAL_DATA.topOilTemp}°C</div>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                      <div className="text-[9px] text-zinc-500 mb-1">Winding</div>
                      <div className="text-sm font-bold text-orange-400 font-mono">{THERMAL_DATA.windingTemp}°C</div>
                    </div>
                  </div>

                  {/* Remaining insulation life */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-medium text-red-300">Remaining Insulation Life</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-red-400 font-mono">{THERMAL_DATA.remainingLife}</span>
                      <span className="text-xs text-red-300">hours</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-1">
                      At current load ({(THERMAL_DATA.loadFactor * 100).toFixed(0)}%), degradation rate: {THERMAL_DATA.degradationRate}%/hr
                    </p>
                  </div>
                </div>
              </section>

              {/* Paper Carbonization Warning */}
              {THERMAL_DATA.hotSpotTemp > THERMAL_DATA.ieeeLimit && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-300 mb-1">IEEE C57.91 Alert</p>
                    <p className="text-[10px] text-red-200/80">
                      Hot-spot exceeds 110°C threshold. Paper insulation carbonization accelerating. 
                      Immediate load reduction or crew dispatch recommended.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ACTIONS TAB */}
          {activeTab === "actions" && (
            <>
              {/* Topology Info */}
              <div className={cn(
                "rounded-lg p-4 mb-4",
                isIsolated ? "bg-green-500/10 border border-green-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {isIsolated ? (
                    <Scissors className="w-4 h-4 text-green-400" />
                  ) : (
                    <MapPin className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={cn(
                    "text-xs font-bold uppercase",
                    isIsolated ? "text-green-400" : "text-yellow-400"
                  )}>
                    {isIsolated ? "Isolated Load Topology" : "Shared Secondary Topology"}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  {isIsolated 
                    ? "Single customer connection. 30A contactor installed on 240V secondary. Auto-cut permitted."
                    : "Multiple customers on same secondary. No contactor installed. Auto-cut DISABLED for safety."
                  }
                </p>
              </div>

              {/* Hardware-Constrained Actions */}
              {isIsolated ? (
                <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Scissors className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Secondary Cut Control</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-mono text-zinc-300">Contactor State</span>
                      </div>
                      <span className="text-[10px] font-mono text-green-400">CLOSED (NORMAL)</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Battery className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs font-mono text-zinc-300">Backup Battery</span>
                      </div>
                      <span className="text-[10px] font-mono text-green-400">{FORENSIC_DATA.batteryVoltage}V OK</span>
                    </div>
                  </div>

                  <button 
                    className="w-full mt-4 p-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2"
                    onClick={() => alert("Execute Secondary Cut command would be sent via secure cellular to ESP32-S3 -> optocoupler -> 30A contactor")}
                  >
                    <Scissors className="w-4 h-4" />
                    Execute Secondary Cut
                  </button>
                  
                  <p className="text-[9px] text-zinc-500 mt-3 font-mono text-center">
                    Cellular command → ESP32-S3 → Optocoupler → 30A Contactor
                  </p>
                </section>
              ) : (
                <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Crew Dispatch</h3>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mb-4">
                    <p className="text-[10px] text-yellow-200/80 mb-2">
                      Auto-cut is DISABLED for this pole. Shared secondary topology requires physical crew intervention.
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">GPS Coordinates</span>
                      <span className="font-mono text-zinc-300">-26.1742°, 28.2341°</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Dispatch Priority</span>
                      <span className="font-mono text-red-400">HIGH (Theft+Thermal)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Nearest Truck</span>
                      <span className="font-mono text-zinc-300">ETA: 23 minutes</span>
                    </div>
                  </div>

                  <button 
                    className="w-full p-3 bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2"
                    onClick={() => alert("Crew dispatch request sent to utility truck dispatch system with GPS pin and forensic data")}
                  >
                    <Truck className="w-4 h-4" />
                    Dispatch Crew
                  </button>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}