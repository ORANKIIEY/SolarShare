"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Box, 
  Wind, 
  Plane, 
  Target, 
  Activity, 
  ShieldAlert,
  Satellite,
  Cpu,
  Wifi,
  Thermometer
} from "lucide-react";
import { useEdgeDevices } from "@/hooks/useEdgeDevices";

/**
 * DIGITAL TWIN MAP (HIGH-FIDELITY SIMULATION)
 *
 * This component provides a simulated 3D environment showing:
 * 1. OpenStreetMap + Leaflet spatial layer (Huawei Cloud CDN tile delivery)
 * 2. Real-time Grid telemetry from MQTT/ROMA Connect pipeline
 * 3. Grid Infrastructure Assets in 3D space
 * 4. Live ESP32 edge device telemetry from backend
 */

export default function DigitalTwinMap({ isColorMode = false }: { isColorMode?: boolean }) {
  const [bootSequence, setBootSequence] = useState(0);
  const { devices, loading, connectionStatus } = useEdgeDevices();
  
  // Use first device or fallback to demo data
  const device = devices[0] || {
    deviceId: "esp32-pole-001",
    signalStrength: -64,
    temperature: 42.0,
    firmwareVersion: "GG-WIFI-AX-1.4.2",
    mqttQueueDepth: 0,
    status: "online"
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBootSequence(s => (s < 100 ? s + 1 : 100));
    }, 20);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-150 bg-void rounded-lg overflow-hidden border border-acid/20 group">
      {/* Spatial Layer — OpenStreetMap via Leaflet, CDN via Huawei Cloud (Project_Work_Breakdown: AWS/Azure CDN → Huawei Cloud CDN) */}
      <div className={cn(
        "absolute inset-0 transition-all duration-700",
        isColorMode ? "opacity-100" : "opacity-60 grayscale contrast-125 mix-blend-screen"
      )}>
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=27.8,-26.4,28.3,-26.0&layer=mapnik`}
          className="w-full h-full border-0 scale-110"
          allowFullScreen
          loading="lazy"
          title="GridGuard Digital Twin — OpenStreetMap"
        />
      </div>

      {/* Grid Overlay / Scanning Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] opacity-60" />
        <div className="absolute inset-0 bg-[linear-to-b(transparent_0%,#ccff0005_50%,transparent_100%)] h-20 w-full animate-scan" />
      </div>

      {/* HUD: Top Left - System Status */}
      <div className="absolute top-6 left-6 z-10 space-y-4">
        <div className="bg-void/80 backdrop-blur-xl border border-acid/30 p-4 rounded-lg shadow-[0_0_20px_rgba(204,255,0,0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-acid animate-pulse" />
            <div className="text-[10px] font-mono text-acid uppercase tracking-[0.2em]">
              Visual Engine: Active
            </div>
          </div>
          <div className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            Digital Twin <span className="text-xs font-mono font-normal text-zinc-500">v4.0.2</span>
          </div>
          <div className="mt-3 flex gap-4 border-t border-white/5 pt-3">
            <div className="space-y-1">
              <div className="text-[8px] text-zinc-500 uppercase font-mono">Precision</div>
              <div className="text-xs font-mono text-white">0.02m</div>
            </div>
            <div className="space-y-1">
              <div className="text-[8px] text-zinc-500 uppercase font-mono">Latency</div>
              <div className="text-xs font-mono text-acid">14ms</div>
            </div>
            <div className="space-y-1">
              <div className="text-[8px] text-zinc-500 uppercase font-mono">Sync</div>
              <div className="text-xs font-mono text-blue-400">Huawei Cloud</div>
            </div>
          </div>
        </div>

        {/* Real-time Grid Telemetry (ROMA Connect Integration — Project_Work_Breakdown: Celery → ROMA Connect) */}
        <div className="bg-void/80 backdrop-blur-xl border border-white/10 p-4 rounded-lg w-72">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Plane className="w-3 h-3 text-blue-400" />
              Air Traffic Feed
            </div>
            <div className="text-[8px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              ROMA LIVE
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-start group/flight cursor-help">
              <div>
                <div className="text-xs font-mono text-white font-bold">ZA-DRONE-04 <span className="text-[10px] font-normal text-zinc-500 ml-1">#INSPECTION</span></div>
                <div className="text-[9px] font-mono text-zinc-500 mt-0.5 uppercase">Alt: 150m | Spd: 42km/h</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-acid">ON TRACK</div>
                <div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-acid w-3/4 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-start opacity-50 grayscale">
              <div>
                <div className="text-xs font-mono text-zinc-300">SAA-102 <span className="text-[10px] font-normal text-zinc-600 ml-1">#COMMERCIAL</span></div>
                <div className="text-[9px] font-mono text-zinc-600 mt-0.5 uppercase">Alt: 3500m | Spd: 840km/h</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-zinc-600">BYPASS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HUD: Bottom Left - Infrastructure Diagnostics */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="bg-void/80 backdrop-blur-xl border border-white/10 p-4 rounded-lg flex gap-6">
          <div className="flex flex-col gap-1">
            <div className="text-[8px] text-zinc-500 uppercase font-mono">Environment</div>
            <div className="flex items-center gap-2">
              <Wind className="w-3 h-3 text-zinc-400" />
              <span className="text-xs font-mono text-white">12km/h NW</span>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col gap-1">
            <div className="text-[8px] text-zinc-500 uppercase font-mono">Imagery</div>
            <div className="flex items-center gap-2">
              <Satellite className="w-3 h-3 text-zinc-400" />
              <span className="text-xs font-mono text-white">LOD 18 (Max)</span>
            </div>
          </div>
        </div>
      </div>

      {/* HUD: Right Side - Asset Scanning & Hardware */}
      <div className="absolute top-6 right-6 z-10 w-64 space-y-4 text-white">
        {/* ESP32 Hardware Diagnostics - Live from Backend */}
        <div className="bg-void/90 backdrop-blur-xl border border-blue-500/30 p-4 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest flex items-center gap-2 font-bold">
              <Cpu className="w-3.5 h-3.5" />
              ESP32 Node v2
              {connectionStatus === "connected" && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1" title="Live" />
              )}
            </div>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
              <div className="w-1 h-1 rounded-full bg-blue-500" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/5 p-2 rounded border border-white/5">
              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Signal</div>
              <div className="flex items-center gap-1.5">
                <Wifi className={`w-3 h-3 ${device.signalStrength > -70 ? 'text-success' : device.signalStrength > -80 ? 'text-yellow-400' : 'text-red-400'}`} />
                <span className="text-xs font-mono">{device.signalStrength}dBm</span>
              </div>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/5">
              <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Temp</div>
              <div className="flex items-center gap-1.5">
                <Thermometer className={`w-3 h-3 ${device.temperature > 60 ? 'text-red-400' : device.temperature > 50 ? 'text-orange-400' : 'text-green-400'}`} />
                <span className="text-xs font-mono">{device.temperature.toFixed(1)}°C</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-mono uppercase">
              <span className="text-zinc-500">MQTT Queue</span>
              <span className={device.mqttQueueDepth > 10 ? 'text-yellow-400' : 'text-blue-400'}>
                {device.mqttQueueDepth} msgs
              </span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${device.mqttQueueDepth > 10 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((device.mqttQueueDepth / 20) * 100, 100)}%` }} 
              />
            </div>
            <div className="text-[8px] font-mono text-zinc-600 text-center italic mt-1">
              Firmware: {device.firmwareVersion}
            </div>
          </div>
        </div>

        <div className="bg-void/80 backdrop-blur-xl border border-danger/30 p-4 rounded-lg border-l-4 border-l-danger">
          <div className="flex items-center gap-2 mb-2 text-danger">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Active Threat Area</span>
          </div>
          <div className="text-xs font-mono text-zinc-300 leading-relaxed">
            3D Photogrammetry detects suspicious cabling at <span className="text-white font-bold">Node TR-03</span>. 
            Cross-referencing with satellite change detection.
          </div>
        </div>

        <div className="bg-void/80 backdrop-blur-xl border border-white/10 p-4 rounded-lg space-y-4">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">
            Infrastructure Layer
          </div>
          <div className="space-y-3">
            {[
              { id: "TR-01", type: "Transformer", load: "45%" },
              { id: "PL-04", type: "Pole Node", load: "12%" },
              { id: "SS-01", type: "Substation", load: "88%" },
            ].map(asset => (
              <div key={asset.id} className="flex justify-between items-center group/asset cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-acid rounded-sm" />
                  <span className="text-[10px] font-mono text-white group-hover/asset:text-acid transition-colors">{asset.id}</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">{asset.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full-screen Boot Overlay */}
      {bootSequence < 100 && (
        <div className="absolute inset-0 z-50 bg-void flex items-center justify-center">
          <div className="w-64 space-y-4">
            <div className="flex justify-between text-[10px] font-mono text-acid uppercase tracking-widest">
              <span>Streaming 3D Tiles...</span>
              <span>{bootSequence}%</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-acid transition-all duration-300" 
                style={{ width: `${bootSequence}%` }} 
              />
            </div>
            <div className="text-[8px] font-mono text-zinc-600 uppercase text-center">
              Connecting to Huawei ModelArts Photogrammetry Pipeline
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

