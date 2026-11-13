"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Coins,
  Zap,
  Lock,
  ArrowLeft,
  Database,
  Cpu,
} from "lucide-react";
import {
  CONTRACT_ADDRESSES,
  baseSepolia,
  publicClient,
  getMeterStatus,
  getMeterState,
  getTotalSupply,
  getSharesRemaining,
  getPricePerShare,
  getSharesOwned,
  getPendingPayout,
  getClaimBlocker,
  formatUsdc,
  formatShares,
  formatEnergyKwh,
  USE_SAMPLE_DATA,
} from "@/lib/chain";
import { type MeterState, MeterStatus, ClaimBlocker, type Address, MAX_SUPPLY } from "@/lib/chain-types";

// Deployer address approved during issue #11 deployment
const DEMO_INVESTOR: Address = "0xf8fC9ECC8CE2f51Bf0E408b9f1A764C52ef250B8";

export default function SolarDebugPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Live Read States
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [sharesRemaining, setSharesRemaining] = useState<string>("0");
  const [pricePerShare, setPricePerShare] = useState<string>("0.00");
  const [meterStatus, setMeterStatus] = useState<string>("Loading...");
  const [meterStatusCode, setMeterStatusCode] = useState<number>(0);
  const [meterState, setMeterState] = useState<MeterState | null>(null);
  const [demoShares, setDemoShares] = useState<string>("0");
  const [demoPayout, setDemoPayout] = useState<string>("0.00");
  const [claimBlockerMsg, setClaimBlockerMsg] = useState<string>("Checking...");
  const [canClaim, setCanClaim] = useState<boolean>(false);
  const [isLiveOnchain, setIsLiveOnchain] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setError(null);
      setRefreshing(true);

      // Perform parallel reads via viem
      const [
        tsRes,
        srRes,
        ppsRes,
        statusRes,
        stateRes,
        sharesRes,
        payoutRes,
        blockerRes,
      ] = await Promise.all([
        getTotalSupply(),
        getSharesRemaining(),
        getPricePerShare(),
        getMeterStatus(),
        getMeterState(),
        getSharesOwned(DEMO_INVESTOR),
        getPendingPayout(DEMO_INVESTOR),
        getClaimBlocker(DEMO_INVESTOR),
      ]);

      setTotalSupply(tsRes.formatted);
      setSharesRemaining(srRes.formatted);
      setPricePerShare(ppsRes.formatted);
      setMeterStatus(statusRes.statusLabel);
      setMeterStatusCode(statusRes.status);
      setMeterState(stateRes.state);
      setDemoShares(sharesRes.formatted);
      setDemoPayout(payoutRes.formatted);
      setClaimBlockerMsg(blockerRes.message);
      setCanClaim(blockerRes.canClaim);

      // Verify if connection responded from live blockchain
      const isLive = !tsRes.error && !statusRes.error && !USE_SAMPLE_DATA;
      setIsLiveOnchain(isLive);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Debug fetch error:", err);
      setError(err?.message || "Failed to query Base Sepolia contracts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/solar"
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Back to Solar Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-none">
                Solar<span className="text-amber-600">Share</span> Onchain Debug
              </h1>
              <span className="text-[10px] font-mono text-gray-500">
                Base Sepolia (Chain ID: 84532)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold bg-gray-50">
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveOnchain ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-gray-700">
              {isLiveOnchain ? "Base Sepolia Live" : "Sample Data Active"}
            </span>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ── Main Container ──────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Activity className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Real-time viem RPC client connecting directly to Base Sepolia smart contracts. No wallet required to read.
            </span>
          </div>
          {lastRefreshed && (
            <span className="font-mono text-gray-500 shrink-0">
              Last synced: {lastRefreshed}
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Contract Live Status Cards ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">MeterOracle Status</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  meterStatusCode === 0 ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                }`}
              />
              <span className="text-2xl font-black text-gray-900">{meterStatus}</span>
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-1">
              Code: {meterStatusCode} ({meterStatusCode === 0 ? "Normal" : "Payouts Paused"})
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">SolarShareToken Total Supply</div>
            <div className="mt-2 text-2xl font-black text-gray-900">{totalSupply}</div>
            <div className="text-[11px] font-mono text-gray-500 mt-1">
              Max Supply Cap: {MAX_SUPPLY.toString()} shares
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">ShareSale Remaining</div>
            <div className="mt-2 text-2xl font-black text-gray-900">{sharesRemaining}</div>
            <div className="text-[11px] font-mono text-gray-500 mt-1">
              Available for immediate buy
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">Fixed Share Price</div>
            <div className="mt-2 text-2xl font-black text-emerald-600">
              ${pricePerShare} USDC
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-1">
              6 Decimals (5,000,000 units)
            </div>
          </div>
        </div>

        {/* ── Meter Hardware Oracle State ─────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-gray-900 text-base">
                Physical Meter Oracle State (ESP32)
              </h2>
            </div>
            <span className="text-[11px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
              Meter ID #{meterState?.meterId ?? 1}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Total Produced:</span>
              <div className="font-bold text-gray-900 mt-1 text-sm font-mono">
                {meterState ? formatEnergyKwh(meterState.totalProducedWh) : "0"} kWh
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Total Sold:</span>
              <div className="font-bold text-gray-900 mt-1 text-sm font-mono">
                {meterState ? formatEnergyKwh(meterState.totalSoldWh) : "0"} kWh
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Current Power:</span>
              <div className="font-bold text-gray-900 mt-1 text-sm font-mono">
                {meterState ? (meterState.lastPowerW / 1000).toFixed(2) : "0.00"} kW
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Unmetered Gap:</span>
              <div className="font-bold text-gray-900 mt-1 text-sm font-mono">
                {meterState ? (meterState.lastGapBps / 100).toFixed(2) : "0"}%
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Theft Active:</span>
              <div className="font-bold mt-1 text-sm font-mono">
                {meterState?.theftActive ? (
                  <span className="text-red-600">TRUE (Theft)</span>
                ) : (
                  <span className="text-emerald-600">FALSE</span>
                )}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Tamper Active:</span>
              <div className="font-bold mt-1 text-sm font-mono">
                {meterState?.tamperActive ? (
                  <span className="text-red-600">TRUE (Open)</span>
                ) : (
                  <span className="text-emerald-600">FALSE</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-gray-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <span>
              Device Signer: <strong>{meterState?.deviceSigner || "Loading..."}</strong>
            </span>
            <span>
              Last Sequence #{meterState?.lastSeq?.toString() || "0"} · Timeout:{" "}
              {meterState?.offlineTimeout?.toString() || "120"}s
            </span>
          </div>
        </div>

        {/* ── Demo Investor Wallet State ──────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-900 text-base">
                Investor Account Query (Approved Deployer)
              </h2>
            </div>
            <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
              KYC Approved
            </span>
          </div>

          <div className="text-xs text-gray-600 font-mono truncate">
            Target Address: <strong>{DEMO_INVESTOR}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Shares Owned:</span>
              <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                {demoShares} SSBA
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Pending USDC Payout:</span>
              <div className="text-xl font-bold text-emerald-600 mt-1 font-mono">
                ${demoPayout} USDC
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-500">Claim Status:</span>
              <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                {canClaim ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-600" />
                )}
                <span>{claimBlockerMsg}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Deployed Contract Registry ──────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-900 text-base">
                Base Sepolia Contract Registry
              </h2>
            </div>
            <a
              href="https://sepolia.basescan.org"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Basescan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="divide-y divide-gray-100 text-xs font-mono">
            {Object.entries(CONTRACT_ADDRESSES).map(([name, address]) => (
              <div key={name} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-semibold text-gray-900">{name}</span>
                <a
                  href={`https://sepolia.basescan.org/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline hover:text-blue-800 flex items-center gap-1 text-[11px]"
                >
                  <span>{address}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
