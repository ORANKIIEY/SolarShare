"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { apiGetGhostLoadDataStrict } from "@/lib/api-strict";
import { useBackendData } from "@/hooks/useBackendData";

interface TelemetryPoint {
  time: string;
  supply: number;
  metered: number;
}

export function GhostLoadChart() {
  // Load data from backend with 5-second refresh
  const { data, loading, error } = useBackendData<TelemetryPoint[]>({
    fetchFn: apiGetGhostLoadDataStrict,
    refreshInterval: 5000,
  });

  const [isTheftActive, setIsTheftActive] = useState(false);

  // Check if theft is detected based on data
  if (data && data.length > 0) {
    const latest = data[data.length - 1];
    const theftDetected = latest.supply > latest.metered + 20;
    if (theftDetected !== isTheftActive) {
      setIsTheftActive(theftDetected);
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-75 bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-mono">Loading telemetry data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-75 bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 font-mono mb-2">Failed to load data</p>
          <p className="text-xs text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-75 bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <p className="text-sm text-gray-600 font-mono">No telemetry data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-75 bg-white border border-gray-200 rounded-lg p-4 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-widest">
            Real-Time Energy Balancing
          </h3>
          <p className="text-[10px] text-gray-700 font-mono">
            Pole Current vs Sum of All Meters
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-[10px] font-mono text-red-600">Ghost Load (Theft)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-acid" />
            <span className="text-[10px] font-mono text-green-600">Legitimate Load</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff453a" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ff453a" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMetered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ccff00" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ccff00" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#6b7280" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            unit="A"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', fontSize: '12px' }}
            itemStyle={{ fontFamily: 'monospace', color: '#111' }}
          />
          
          {/* Layer 1: The Total Supply (Red) - Drawn first (behind) */}
          <Area 
            type="monotone" 
            dataKey="supply" 
            stroke="#ff453a" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorSupply)" 
            isAnimationActive={false}
          />

          {/* Layer 2: The Metered Sum (Green) - Drawn second (on top) */}
          <Area 
            type="monotone" 
            dataKey="metered" 
            stroke="#ccff00" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorMetered)" 
            isAnimationActive={false}
          />
          
          {isTheftActive && data.length > 1 && (
            <ReferenceLine x={data[data.length - 2]?.time} stroke="white" strokeDasharray="3 3" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}