"use client";

import React, { useState, useEffect } from "react";
import { MOCK_ASSETS, type Asset } from "@/lib/data";
import { Server, MoreHorizontal, Download, AlertTriangle, Activity, Zap } from "lucide-react";
import { 
  apiGetAssets, 
  apiGetIncidents, 
  apiGetRecentTelemetry,
  type ApiAsset,
  type ApiIncident
} from "@/lib/api";

export default function AssetsPage() {
  const [assets, setAssets] = useState(MOCK_ASSETS);
  const [incidents, setIncidents] = useState<ApiIncident[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [assetsData, incidentsData, telemetryData] = await Promise.all([
          apiGetAssets(),
          apiGetIncidents("active"),
          apiGetRecentTelemetry()
        ]);

        if (assetsData && assetsData.length > 0) {
          setAssets(assetsData.map(a => ({
            id: a.id,
            type: a.type as Asset["type"],
            location: a.location,
            status: a.status as Asset["status"],
            load: a.load,
            lastInspection: new Date(a.lastInspection).toLocaleDateString(),
          })));
        }

        if (incidentsData) {
          setIncidents(incidentsData);
        }

        if (telemetryData) {
          setTelemetry(telemetryData);
        }
      } catch (error) {
        console.error("Failed to load assets data:", error);
        // API unavailable — keep mock data
      } finally {
        setLoading(false);
      }
    })();

    // Set up real-time telemetry updates
    const interval = setInterval(async () => {
      try {
        const telemetryData = await apiGetRecentTelemetry();
        if (telemetryData) {
          setTelemetry(telemetryData);
        }
      } catch (error) {
        console.error("Failed to refresh telemetry:", error);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-12 space-y-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-gray-600 font-mono">Loading infrastructure data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-black flex items-center gap-3">
            <Server className="text-gray-600 w-8 h-8" />
            Grid Assets
          </h1>
          <p className="text-gray-700 font-mono text-sm">
            Infrastructure inventory and operational status.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded text-xs text-white font-mono uppercase transition-colors">
          <Download className="w-3 h-3" /> Export CSV
        </button>
      </div>

      {/* Active Incidents */}
      {incidents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-600 w-6 h-6" />
            <h2 className="text-lg font-bold text-red-800">Active Incidents</h2>
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-mono">
              {incidents.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="bg-white border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-gray-500">{incident.time}</span>
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded border border-red-200">
                    {incident.confidence}% confidence
                  </span>
                </div>
                <h3 className="font-bold text-sm text-black mb-1">{incident.type}</h3>
                <p className="text-xs text-gray-600 mb-2">{incident.location}</p>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-red-500" />
                  <span className="text-xs font-mono text-red-600">ACTIVE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Telemetry */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="text-blue-600 w-6 h-6" />
          <h2 className="text-lg font-bold text-blue-800">Live Telemetry</h2>
          <span className="text-xs font-mono text-blue-600">Updates every 10s</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {telemetry.slice(0, 6).map((reading, index) => (
            <div key={index} className="bg-white border border-blue-200 rounded-lg p-3">
              <div className="text-xs font-mono text-gray-500 mb-1">{reading.time}</div>
              <div className="text-lg font-bold text-black font-mono">{reading.deviceId}</div>
              <div className="text-sm text-blue-600 font-mono">{reading.current}A</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-mono text-black tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Asset ID</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Location</th>
              <th className="px-6 py-4 font-medium">Load Capacity</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Last Inspection</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.map((asset) => (
              <tr key={asset.id} className="group hover:bg-gray-50 transition-colors font-mono text-xs">
                <td className="px-6 py-4 text-black font-bold">{asset.id}</td>
                <td className="px-6 py-4 text-gray-700">{asset.type}</td>
                <td className="px-6 py-4 text-gray-700">{asset.location}</td>
                <td className="px-6 py-4 text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${asset.load > 90 ? 'bg-red-600' : asset.load > 70 ? 'bg-yellow-600' : 'bg-green-600'}`}
                        style={{ width: `${asset.load}%` }}
                      />
                    </div>
                    {asset.load}%
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`
                    px-2 py-0.5 rounded text-[10px] uppercase border
                    ${asset.status === 'healthy' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                    ${asset.status === 'warning' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                    ${asset.status === 'critical' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                    ${asset.status === 'offline' ? 'bg-gray-100 text-gray-600 border-gray-200' : ''}
                  `}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">{asset.lastInspection}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 hover:bg-gray-100 rounded text-gray-700 hover:text-black transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}