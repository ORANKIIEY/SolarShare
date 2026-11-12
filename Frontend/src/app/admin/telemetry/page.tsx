"use client";

import React, { useState, useEffect } from "react";
import { Activity, Zap, Waves, Box, Cpu, Wifi, Thermometer, ShieldCheck } from "lucide-react";
import { HarmonicChart } from "@/features/monitor/HarmonicChart";
import { GhostLoadChart } from "@/features/monitor/GhostLoadChart";
import { apiGetRecentTelemetry } from "@/lib/api"; // Kept for Phase 2 readiness

const INITIAL_METRICS = [
  { id: 1, label: "Avg Voltage (L1)", value: "231.4", unit: "V", status: "normal" },
  { id: 2, label: "Frequency", value: "49.98", unit: "Hz", status: "normal" },
  { id: 3, label: "Power Factor", value: "0.84", unit: "PF", status: "warning" },
  { id: 4, label: "Grid Load", value: "92", unit: "%", status: "critical" }
];

const INITIAL_STREAM = [...Array(5)].map((_, i) => ({
  id: i,
  time: `10:42:${15 + i}`,
  nodeId: `TR-0${i + 1}`,
  metric: "Voltage Sag",
  value: "-12%",
  status: "WARNING"
}));

// Reusable Metric Card
function MetricCard({ label, value, unit, status = "normal" }: any) {
  const color = status === "critical" ? "text-red-600" : status === "warning" ? "text-yellow-600" : "text-black";
  const border = status === "critical" ? "border-red-200" : "border-gray-200";
  const bg = "bg-white";

  return (
    <div className={`${bg} border ${border} p-4 rounded-lg shadow-sm`}>
      <div className="text-[10px] font-mono text-black uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>
        {value} <span className="text-xs text-gray-500 font-normal">{unit}</span>
      </div>
    </div>
  )
}

export default function TelemetryPage() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [stream, setStream] = useState(INITIAL_STREAM);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const data = await apiGetRecentTelemetry();
        if (data && data.length > 0) {
          setStream(data.map((d, i) => ({
            id: i,
            time: d.time,
            nodeId: d.deviceId,
            metric: "Current",
            value: `${d.current.toFixed(1)}A`,
            status: d.current > 20 ? "CRITICAL" : d.current > 15 ? "WARNING" : "NORMAL",
          })));
        }
      } catch {
        // API unavailable — keep mock data
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 md:p-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-black">
          Signal Telemetry
        </h1>
        <p className="text-gray-700 font-mono text-sm">
          Real-time grid stability & power quality monitoring.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <MetricCard key={m.id} label={m.label} value={m.value} unit={m.unit} status={m.status} />
        ))}
      </div>

      {/* Deep Dive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: The Harmonic Analysis we just built */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-sm"></div>
            <h2 className="text-sm font-bold text-black uppercase">Power Quality (FFT)</h2>
          </div>
          <HarmonicChart />
        </div>

        {/* Chart 2: Reuse the Ghost Load Chart for context */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-sm"></div>
            <h2 className="text-sm font-bold text-black uppercase">Loss Detection</h2>
          </div>
          <GhostLoadChart />
        </div>
      </div>

      {/* Hardware Diagnostics Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden group shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Cpu className="w-32 h-32 text-gray-400" />
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/3 space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Cpu className="w-5 h-5" />
              <h2 className="text-lg font-bold tracking-tight text-black">ESP32 Hardware Node</h2>
            </div>
            <p className="text-xs text-gray-700 font-mono leading-relaxed">
              Live heartbeat from the edge sensing device. 
              Encrypted MQTT tunnel active via Huawei Cloud IoT.
            </p>
            <div className="pt-4 flex gap-3">
              <div className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-[10px] font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> SECURE
              </div>
              <div className="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[10px] font-mono">
                v2.4.0-PROD
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="text-[10px] font-mono text-gray-600 uppercase mb-2 flex justify-between">
                <span>Signal Strength</span>
                <Wifi className="w-3 h-3 text-green-600" />
              </div>
              <div className="text-xl font-bold text-black font-mono">-64 <span className="text-[10px] text-gray-500">dBm</span></div>
              <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 w-3/4" />
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="text-[10px] font-mono text-gray-600 uppercase mb-2 flex justify-between">
                <span>CPU Temp</span>
                <Thermometer className="w-3 h-3 text-orange-500" />
              </div>
              <div className="text-xl font-bold text-black font-mono">42.8 <span className="text-[10px] text-gray-500">°C</span></div>
              <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-2/5" />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="text-[10px] font-mono text-gray-600 uppercase mb-2 flex justify-between">
                <span>Buffer Health</span>
                <Activity className="w-3 h-3 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-black font-mono">99.2 <span className="text-[10px] text-gray-500">%</span></div>
              <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[99%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Log Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-xs font-bold font-mono text-black uppercase tracking-widest">
            Raw Telemetry Stream (Last 10s)
          </h3>
        </div>
        <table className="w-full text-left text-sm font-mono text-black">
          <thead className="bg-gray-100 text-[10px] uppercase text-gray-600">
            <tr>
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-6 py-3 font-medium">Node ID</th>
              <th className="px-6 py-3 font-medium">Metric</th>
              <th className="px-6 py-3 font-medium">Value</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stream.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-700">{row.time}</td>
                <td className="px-6 py-3 text-black">{row.nodeId}</td>
                <td className="px-6 py-3 text-gray-700">{row.metric}</td>
                <td className="px-6 py-3 text-yellow-600">{row.value}</td>
                <td className="px-6 py-3"><span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-[10px] border border-yellow-200">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}