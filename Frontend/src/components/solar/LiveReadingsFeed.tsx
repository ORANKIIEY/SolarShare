"use client";

import React, { useState, useEffect } from "react";
import { Activity, ExternalLink, Zap, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/lib/chain";
import sampleData from "@/lib/sample-data.json";

interface ReadingItem {
  seq: number;
  timestamp: string;
  producedKwh: string;
  soldKwh: string;
  powerKw: string;
  gapPercent: string;
  isTheft: boolean;
  txHash: string;
}

const INITIAL_READINGS: ReadingItem[] = [
  {
    seq: 25922,
    timestamp: "12 seconds ago",
    producedKwh: "9,000.1",
    soldKwh: "8,100.0",
    powerKw: "6.60",
    gapPercent: "63.6%",
    isTheft: true,
    txHash: "0x7d2c4b9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4",
  },
  {
    seq: 25921,
    timestamp: "1 minute ago",
    producedKwh: "9,000.0",
    soldKwh: "8,100.0",
    powerKw: "6.42",
    gapPercent: "9.25%",
    isTheft: false,
    txHash: "0x8e3d5c0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5",
  },
  {
    seq: 25920,
    timestamp: "2 minutes ago",
    producedKwh: "8,999.8",
    soldKwh: "8,099.9",
    powerKw: "6.41",
    gapPercent: "9.34%",
    isTheft: false,
    txHash: "0x9f4e6d1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6",
  },
  {
    seq: 25919,
    timestamp: "3 minutes ago",
    producedKwh: "8,999.7",
    soldKwh: "8,099.8",
    powerKw: "6.38",
    gapPercent: "9.30%",
    isTheft: false,
    txHash: "0xa05f7e2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7",
  },
];

export default function LiveReadingsFeed() {
  const [readings, setReadings] = useState<ReadingItem[]>(INITIAL_READINGS);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-600 animate-pulse" />
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">
            Live Oracle Readings Feed (Wokwi ESP32)
          </h3>
        </div>
        <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
          60s Interval
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 font-mono text-[11px]">
              <th className="py-2">Seq #</th>
              <th className="py-2">Time</th>
              <th className="py-2">Power</th>
              <th className="py-2">Produced</th>
              <th className="py-2">Sold</th>
              <th className="py-2">Gap</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono">
            {readings.map((r) => (
              <tr
                key={r.seq}
                className={`transition-colors ${
                  r.isTheft ? "bg-red-50/70 hover:bg-red-50" : "hover:bg-gray-50/80"
                }`}
              >
                <td className="py-2.5 font-bold text-gray-900">#{r.seq}</td>
                <td className="py-2.5 text-gray-500 font-sans">{r.timestamp}</td>
                <td className="py-2.5 text-gray-900 font-bold">{r.powerKw} kW</td>
                <td className="py-2.5 text-gray-600">{r.producedKwh} kWh</td>
                <td className="py-2.5 text-gray-600">{r.soldKwh} kWh</td>
                <td
                  className={`py-2.5 font-bold ${
                    r.isTheft ? "text-red-700 font-black" : "text-emerald-700"
                  }`}
                >
                  {r.gapPercent}
                </td>
                <td className="py-2.5">
                  {r.isTheft ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                      <ShieldAlert className="w-3 h-3" /> THEFT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> OK
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  <a
                    href={`https://sepolia.basescan.org/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-600 hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <span>{r.txHash.slice(0, 8)}...</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
