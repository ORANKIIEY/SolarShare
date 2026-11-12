"use client";

import { useState, useEffect } from "react";
import MapLoader from "@/features/map/MapLoader";
import { ControlDrawer } from "@/features/control/ControlDrawer";
import { WaveformForensics } from "@/features/monitor/WaveformForensics";
import { EdgeEventLog } from "@/features/monitor/EdgeEventLog";
import { useToast } from "@/components/ui/Toast";
import { 
  apiGetDashboardSummary, 
  apiGetAssets, 
  apiGetIncidents,
  apiGetRecentTelemetry,
  type ApiAsset,
  type ApiIncident
} from "@/lib/api";

export default function DashboardPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { showToast } = useToast();
  const [totalSectorLoad, setTotalSectorLoad] = useState("14.2");
  const [activeLosses, setActiveLosses] = useState("R12,450");
  const [totalNodes, setTotalNodes] = useState("1,240");
  const [activeAlerts, setActiveAlerts] = useState("2");
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [incidents, setIncidents] = useState<ApiIncident[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [summary, assetsData, incidentsData, telemetryData] = await Promise.all([
          apiGetDashboardSummary(),
          apiGetAssets(),
          apiGetIncidents(),
          apiGetRecentTelemetry()
        ]);

        if (summary) {
          setTotalSectorLoad(summary.totalSectorLoad.toString());
          setActiveLosses(`R${summary.activeLosses.toLocaleString()}`);
          setTotalNodes(summary.totalNodes.toLocaleString());
          setActiveAlerts(summary.activeAlerts.toString());
        }

        if (assetsData) {
          setAssets(assetsData);
        }

        if (incidentsData) {
          setIncidents(incidentsData);
        }

        if (telemetryData) {
          setTelemetry(telemetryData);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        /* keep hardcoded values on error */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
    setIsDrawerOpen(true);
  };

  const handleEmergencyOverride = () => {
    showToast("EMERGENCY OVERRIDE INITIATED: SECTOR 4 ISOLATING...", "error");
  };

  if (loading) {
    return (
      <div className="p-6 md:p-12 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-gray-600 font-mono">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <img src="/Logo.webp" alt="GridGuard" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-black">
              Situational Awareness
            </h1>
            <p className="text-gray-700 font-mono text-sm">
              Sector 4: Monitoring {totalNodes} Nodes | {activeAlerts} Active Alerts Detected
            </p>
          </div>
        </div>

        <div className="hidden md:flex gap-6">
          <div className="text-right px-4 py-2 bg-white rounded-lg border border-gray-200">
            <div className="text-[10px] font-mono text-gray-500 uppercase">Est. Revenue Recovery</div>
            <div className="text-xl font-bold text-green-600 font-mono">{activeLosses} <span className="text-xs text-gray-500">/hr</span></div>
            <div className="text-[9px] font-mono text-gray-400 mt-1">Ghost load × tariff</div>
          </div>
          <div className="text-right px-4 py-2 bg-white rounded-lg border border-gray-200">
            <div className="text-[10px] font-mono text-gray-500 uppercase">Transformers at Risk</div>
            <div className="text-xl font-bold text-orange-600 font-mono">3 <span className="text-xs text-gray-500">units</span></div>
            <div className="text-[9px] font-mono text-gray-400 mt-1">IEEE C57.91 &gt; 110°C</div>
          </div>
        </div>
      </div>

      {/* The Map Component */}
      <div className="mb-8">
        <MapLoader onPoleClick={handleNodeClick} />
      </div>

      {/* Analytics Row - Edge-Computed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-600 uppercase mb-2">TinyML Theft Confidence</div>
          <div className="text-2xl font-bold text-green-600">94.01%</div>
          <div className="text-xs text-gray-500 mt-2">8-bit quantized NN on ESP32-S3</div>
          <div className="text-[9px] font-mono text-blue-600 mt-1">Edge-computed • No cloud ML</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-600 uppercase mb-2">IEEE C57.91 Thermal Risk</div>
          <div className="text-2xl font-bold text-yellow-600">Medium</div>
          <div className="text-xs text-gray-500 mt-2">Hot-spot rising toward 110°C</div>
          <div className="text-[9px] font-mono text-orange-600 mt-1">Insulation life degrading</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs font-medium text-gray-600 uppercase mb-2">Grid Topology</div>
          <div className="text-2xl font-bold text-blue-600">Mixed</div>
          <div className="text-xs text-gray-500 mt-2">Isolated: 12 | Shared: 1,228</div>
          <div className="text-[9px] font-mono text-gray-400 mt-1">Determines Cut vs Dispatch</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-xs font-medium text-gray-600 uppercase mb-2">ESP-NOW Mesh Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-bold text-black">1,240 Nodes Online</span>
          </div>
          <div className="text-[9px] font-mono text-gray-500 mt-2">Heartbeat: 30s interval</div>
        </div>
      </div>

      {/* Live Waveform Forensics + Edge Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <WaveformForensics poleId={selectedNodeId || "P-042"} />
        </div>

        <div className="h-full">
          <EdgeEventLog className="h-[350px]" />
        </div>
      </div>

      <ControlDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        nodeId={selectedNodeId}
      />
    </div>
  );
}