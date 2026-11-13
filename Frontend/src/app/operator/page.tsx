"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sun,
  Shield,
  Activity,
  AlertTriangle,
  Zap,
  CheckCircle2,
  DollarSign,
  Lock,
  LogOut,
  RefreshCw,
  ExternalLink,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function OperatorPage() {
  const { user, loading, logout } = useAuth("operator");
  const router = useRouter();

  // Demo Operator States
  const [meterStatus, setMeterStatus] = useState<"OK" | "THEFT" | "TAMPER" | "OFFLINE">("OK");
  const [theftGap, setTheftGap] = useState(15);
  const [offlineTimeout, setOfflineTimeout] = useState(120);
  const [depositAmount, setDepositAmount] = useState("500");
  const [tariff, setTariff] = useState("0.20");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Verifying Operator Clearance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col font-sans">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/solar" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-900 text-sm sm:text-base">
              Solar<span className="text-amber-600">Share</span>
            </span>
          </Link>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Operator Console</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-gray-900">{user?.name || "Operator"}</span>
            <span className="text-[10px] font-mono text-gray-500">{user?.email || "operator@solarshare.co.za"}</span>
          </div>
          <Link
            href="/solar/debug"
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Onchain Debug</span>
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors border border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Alert if Action Taken */}
        {actionMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* ── Top Metric Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Meter Status</span>
              <span className={`w-2.5 h-2.5 rounded-full ${meterStatus === "OK" ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900 tracking-tight">
              {meterStatus}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {meterStatus === "OK" ? "All readings verified" : "Payouts automatically paused"}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs text-gray-500 font-medium">Asset ID</div>
            <div className="mt-2 text-2xl font-black text-gray-900 tracking-tight">SSBA-01</div>
            <div className="text-xs text-gray-500 mt-1">Block A Mini-Grid (10 kWp)</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs text-gray-500 font-medium">Attested Sold Energy</div>
            <div className="mt-2 text-2xl font-black text-gray-900 tracking-tight">8,100 kWh</div>
            <div className="text-xs text-gray-500 mt-1">9,000 kWh generated total</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs text-gray-500 font-medium">Deposit Allowance</div>
            <div className="mt-2 text-2xl font-black text-emerald-700 tracking-tight">120 USDC</div>
            <div className="text-xs text-gray-500 mt-1">Capped by verified kWh sold</div>
          </div>
        </div>

        {/* ── Operator Control Grids ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meter Status Controls */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-gray-900 text-base">Meter Oracle Management</h2>
              </div>
              <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                ESP32 #1
              </span>
            </div>

            <p className="text-sm text-gray-600">
              The ESP32 physical meter reports signed power generation every minute. Simulate state changes or inspect thresholds below:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setMeterStatus("OK");
                  showFeedback("Meter status updated to OK. Payouts unpaused.");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  meterStatus === "OK"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Set OK (0)
              </button>
              <button
                onClick={() => {
                  setMeterStatus("THEFT");
                  showFeedback("Simulated THEFT anomaly: sold < 85% of produced energy. Payouts paused.");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  meterStatus === "THEFT"
                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Set THEFT (1)
              </button>
              <button
                onClick={() => {
                  setMeterStatus("TAMPER");
                  showFeedback("Simulated TAMPER detection: meter case opened. Payouts paused.");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  meterStatus === "TAMPER"
                    ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Set TAMPER (2)
              </button>
              <button
                onClick={() => {
                  setMeterStatus("OFFLINE");
                  showFeedback("Simulated OFFLINE: meter timeout exceeded. Payouts paused.");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  meterStatus === "OFFLINE"
                    ? "bg-gray-700 text-white border-gray-700 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Set OFFLINE (3)
              </button>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-600">Theft threshold: <strong>{theftGap}%</strong></span>
              <button
                onClick={() => showFeedback("Tamper flag cleared by operator inspection.")}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
              >
                Clear Tamper Flag
              </button>
            </div>
          </div>

          {/* Revenue Distribution Controls */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-gray-900 text-base">Monthly Revenue Deposit</h2>
              </div>
              <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                USDC (6 dec)
              </span>
            </div>

            <p className="text-sm text-gray-600">
              Deposit revenue from prepaid electricity sales to distribute to shareholders. Cannot exceed the attested kilowatt-hours cap.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Deposit Amount (USDC)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="Enter USDC amount"
                  />
                  <button
                    onClick={() => showFeedback(`Successfully deposited ${depositAmount} USDC to RevenueDistributor.`)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                  >
                    Deposit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Electricity Tariff (USDC / kWh)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tariff}
                    onChange={(e) => setTariff(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => showFeedback(`Tariff updated to ${tariff} USDC / kWh.`)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Additional Operator Quick Links ─────────────────────────── */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Investor Public View</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Preview the asset presentation and share purchase screen seen by township co-owners.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/solar"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-xs transition-colors"
            >
              <span>View /solar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/solar/debug"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
            >
              <span>View /solar/debug</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
