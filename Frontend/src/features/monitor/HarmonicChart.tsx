"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";
import { apiGetHarmonicDataStrict } from "@/lib/api-strict";
import { useBackendData } from "@/hooks/useBackendData";

interface HarmonicPoint {
  name: string;
  value: number;
}

export function HarmonicChart() {
  // Load data from backend
  const { data, loading, error } = useBackendData<HarmonicPoint[]>({
    fetchFn: apiGetHarmonicDataStrict,
    refreshInterval: 10000, // Refresh every 10 seconds
  });

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-87.5 bg-surface border border-border rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-mono">Loading harmonic data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-87.5 bg-surface border border-border rounded-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400 font-mono mb-2">Failed to load data</p>
          <p className="text-xs text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-87.5 bg-surface border border-border rounded-lg p-6 flex items-center justify-center">
        <p className="text-sm text-gray-400 font-mono">No harmonic data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-87.5 bg-surface border border-border rounded-lg p-6 relative">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest">
                Harmonic Distortion Analysis (THD)
            </h3>
            <p className="text-[10px] text-zinc-600 font-mono mt-1">
                FFT Signature: Pole TR-03
            </p>
        </div>
        <div className="text-right">
            <div className="text-2xl font-bold text-warning font-mono">18.4%</div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Total Distortion</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#525252" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#525252" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            cursor={{fill: '#1a1a1a'}}
            contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
            itemStyle={{ fontFamily: 'monospace' }}
          />
          <ReferenceLine y={15} stroke="#ff453a" strokeDasharray="3 3" label={{ position: 'top', value: 'IEC LIMIT', fill: '#ff453a', fontSize: 9 }} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => {
              // Highlight bars that exceed the safe limit (15%) and are not the fundamental
              const isUnsafe = entry.value > 15 && index !== 0;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isUnsafe ? '#ff453a' : '#222'} 
                  stroke={isUnsafe ? '#ff453a' : '#ccff00'}
                  strokeWidth={1}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}