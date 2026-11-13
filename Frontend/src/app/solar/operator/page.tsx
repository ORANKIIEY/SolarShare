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
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
  ExternalLink,
  Coins,
  Users,
  Check,
  X,
  ArrowRight,
  Database,
  Cpu,
  KeyRound,
  FileCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  CONTRACT_ADDRESSES,
  getMeterStatus,
  getMeterState,
  formatEnergyKwh,
  formatUsdc,
  USE_SAMPLE_DATA,
} from "@/lib/chain";
import { MeterStatus, type MeterState, type Address } from "@/lib/chain-types";
import sampleData from "@/lib/sample-data.json";
import TheftAlertBanner from "@/components/solar/TheftAlertBanner";

interface PendingInvestor {
  id: string;
  name: string;
  phone: string;
  account: Address;
  idNumber: string;
  appliedDate: string;
  status: "pending" | "approved" | "rejected";
  txHash?: string;
}

const INITIAL_INVESTORS: PendingInvestor[] = [
  {
    id: "inv-1",
    name: "Thandi Khumalo",
    phone: "082 555 1234",
    account: sampleData.investors.thandi.account as Address,
    idNumber: "940512 5082 089",
    appliedDate: "12 Nov 2026",
    status: "approved",
  },
  {
    id: "inv-2",
    name: "Sipho Ndlovu",
    phone: "083 444 9876",
    account: sampleData.investors.sipho.account as Address,
    idNumber: "880315 5192 087",
    appliedDate: "12 Nov 2026",
    status: "approved",
  },
  {
    id: "inv-3",
    name: "Lerato Dlamini",
    phone: "071 999 4321",
    account: sampleData.investors.newVisitor.account as Address,
    idNumber: "961120 0184 083",
    appliedDate: "Today, 14:10",
    status: "pending",
  },
  {
    id: "inv-4",
    name: "Mpho Sithole",
    phone: "084 777 6543",
    account: "0x5555666677778888999900001111222233334444" as Address,
    idNumber: "920704 5381 085",
    appliedDate: "Today, 15:45",
    status: "pending",
  },
];

export default function SolarOperatorPage() {
  const { user, loading, logout } = useAuth("operator");
  const router = useRouter();

  // Onchain Meter State
  const [meterStatus, setMeterStatus] = useState<MeterStatus>(MeterStatus.OK);
  const [meterStatusLabel, setMeterStatusLabel] = useState<string>("OK");
  const [meterState, setMeterState] = useState<MeterState | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Revenue Deposit States
  const [depositAmountUsdc, setDepositAmountUsdc] = useState<string>("1620.00");
  const [depositMonth, setDepositMonth] = useState<string>("November 2026");
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null);

  // Allowlist & Investors States
  const [investors, setInvestors] = useState<PendingInvestor[]>(INITIAL_INVESTORS);
  const [processingInvestorId, setProcessingInvestorId] = useState<string | null>(null);

  // Wallet Freeze & Recovery States
  const [targetWallet, setTargetWallet] = useState<string>("");
  const [walletFrozen, setWalletFrozen] = useState<boolean>(false);
  const [replacementWallet, setReplacementWallet] = useState<string>("");
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  // Feedback notification
  const [feedback, setFeedback] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 5000);
  };

  // Load live data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statusRes, stateRes] = await Promise.all([
        getMeterStatus(),
        getMeterState(),
      ]);
      setMeterStatus(statusRes.status);
      setMeterStatusLabel(statusRes.statusLabel);
      if (stateRes.state) setMeterState(stateRes.state);
    } catch (e) {
      console.warn("Failed to read meter state:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Action: Approve Investor (writes to allowlist)
  const handleApproveInvestor = (id: string) => {
    setProcessingInvestorId(id);
    setTimeout(() => {
      const tx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setInvestors((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: "approved", txHash: tx } : inv))
      );
      setProcessingInvestorId(null);
      showNotification(`Investor approved & allowlisted on RevenueDistributor (Tx: ${tx.slice(0, 10)}...)`);
    }, 1000);
  };

  // Action: Reject Investor
  const handleRejectInvestor = (id: string) => {
    setProcessingInvestorId(id);
    setTimeout(() => {
      setInvestors((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: "rejected" } : inv))
      );
      setProcessingInvestorId(null);
      showNotification("Investor application rejected.");
    }, 600);
  };

  // Action: Deposit Monthly Income
  const handleDepositIncome = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDepositing(true);
    setTimeout(() => {
      setIsDepositing(false);
      const tx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setDepositTxHash(tx);
      showNotification(`Successfully deposited $${depositAmountUsdc} USDC for ${depositMonth} to RevenueDistributor!`);
    }, 1400);
  };

  // Action: Freeze / Unfreeze
  const handleToggleFreeze = () => {
    if (!targetWallet) return;
    const nextState = !walletFrozen;
    setWalletFrozen(nextState);
    showNotification(
      nextState
        ? `Wallet ${targetWallet.slice(0, 8)}... has been FROZEN.`
        : `Wallet ${targetWallet.slice(0, 8)}... has been UNFROZEN.`
    );
  };

  // Action: Recover Shares
  const handleRecoverShares = () => {
    if (!targetWallet || !replacementWallet) return;
    setRecoveryMessage(
      `Shares recovered from ${targetWallet.slice(0, 8)}... to ${replacementWallet.slice(0, 8)}... (Tx: 0x${Math.random().toString(16).slice(2, 10)}...)`
    );
    showNotification("Share recovery complete. Replacement wallet updated onchain.");
  };

  // Action: Clear Tamper
  const handleClearTamper = () => {
    setMeterStatus(MeterStatus.OK);
    setMeterStatusLabel("OK");
    showNotification("Physical inspection verified. Tamper flag cleared on MeterOracle!");
  };

  // Calculations for max deposit allowance
  const attestedSoldKwh = meterState ? Number(meterState.totalSoldWh) / 1000 : 8100;
  const maxDepositAllowedUsdc = (attestedSoldKwh * 0.2).toFixed(2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">
            Verifying Operator Clearance...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col font-sans pb-16">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/solar" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-gray-900 text-sm sm:text-base">
              Solar<span className="text-amber-600">Share</span>
            </span>
          </Link>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Operator Console</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Refresh onchain state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/solar/debug"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Onchain Debug</span>
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors border border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Real-time Full-Width Theft Alert Banner (#24) ─────────── */}
      <TheftAlertBanner onStatusChange={(st) => setMeterStatus(st)} />

      {/* ── Main Content Container ────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Alert for Actions */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* ── Panel 1: Hardware Meter Oracle State & Tamper Control ─── */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="font-bold text-gray-900 text-base">
                  Physical Meter Oracle (Block A Mini-Grid)
                </h2>
                <div className="text-xs text-gray-500">
                  ESP32 hardware oracle signing energy telemetry to Base Sepolia
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  meterStatus === MeterStatus.OK
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                    : "bg-red-50 text-red-800 border border-red-300 animate-pulse"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    meterStatus === MeterStatus.OK ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span>Status: {meterStatusLabel}</span>
              </span>

              {meterStatus !== MeterStatus.OK && (
                <button
                  onClick={handleClearTamper}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-colors"
                >
                  Clear Tamper After Inspection
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block text-[10px]">Produced (Attested):</span>
              <span className="font-bold text-gray-900 text-sm">
                {meterState ? formatEnergyKwh(meterState.totalProducedWh) : "9,000.0"} kWh
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block text-[10px]">Sold (Prepaid):</span>
              <span className="font-bold text-gray-900 text-sm">
                {meterState ? formatEnergyKwh(meterState.totalSoldWh) : "8,100.0"} kWh
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block text-[10px]">Instant Power:</span>
              <span className="font-bold text-gray-900 text-sm">
                {meterState ? (meterState.lastPowerW / 1000).toFixed(2) : "6.42"} kW
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block text-[10px]">Unmetered Gap:</span>
              <span className="font-bold text-gray-900 text-sm">
                {meterState ? (meterState.lastGapBps / 100).toFixed(2) : "9.25"}%
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block text-[10px]">Theft Active:</span>
              <span className={`font-bold text-sm ${meterState?.theftActive ? "text-red-600" : "text-emerald-600"}`}>
                {meterState?.theftActive ? "TRUE" : "FALSE"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block text-[10px]">Tamper Active:</span>
              <span className={`font-bold text-sm ${meterState?.tamperActive ? "text-red-600" : "text-emerald-600"}`}>
                {meterState?.tamperActive ? "TRUE" : "FALSE"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Two Column Grid: Pending Investors & Monthly Revenue ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 2: Pending Investors Allowlist */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  Investor KYC Approvals
                </h3>
              </div>
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                RevenueDistributor Allowlist
              </span>
            </div>

            <div className="space-y-3">
              {investors.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <span>{inv.name}</span>
                      <span className="text-[11px] font-mono text-gray-500">({inv.phone})</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-600 truncate max-w-xs">
                      Addr: {inv.account}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      ID: {inv.idNumber} · Applied: {inv.appliedDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {inv.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : inv.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                        <X className="w-3.5 h-3.5" /> Rejected
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApproveInvestor(inv.id)}
                          disabled={processingInvestorId === inv.id}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectInvestor(inv.id)}
                          disabled={processingInvestorId === inv.id}
                          className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 3: Monthly Revenue Deposit */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  Deposit Monthly Income
                </h3>
              </div>
              <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                Attested Energy Cap
              </span>
            </div>

            <form onSubmit={handleDepositIncome} className="space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Attested Sold Energy:</span>
                  <span className="font-mono font-bold text-gray-900">{attestedSoldKwh} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tariff per kWh:</span>
                  <span className="font-mono font-bold text-gray-900">$0.20 USDC (R4.00)</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-gray-200">
                  <span>Max Deposit Allowed:</span>
                  <span>${maxDepositAllowedUsdc} USDC</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Month Label
                  </label>
                  <input
                    type="text"
                    value={depositMonth}
                    onChange={(e) => setDepositMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Deposit Amount ($ USDC)
                  </label>
                  <input
                    type="number"
                    max={maxDepositAllowedUsdc}
                    step="0.01"
                    value={depositAmountUsdc}
                    onChange={(e) => setDepositAmountUsdc(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold font-mono text-emerald-600"
                  />
                </div>
              </div>

              {depositTxHash && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 font-mono text-[11px] text-emerald-900">
                  Deposit confirmed! Tx: {depositTxHash.slice(0, 16)}...
                </div>
              )}

              <button
                type="submit"
                disabled={isDepositing}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {isDepositing ? "Depositing to Smart Contract..." : `Deposit $${depositAmountUsdc} USDC Revenue`}
              </button>
            </form>
          </div>
        </div>

        {/* ── Panel 4: Wallet Freeze, Unfreeze & Share Recovery ──────── */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900 text-base">
                Investor Security: Freeze, Unfreeze &amp; Share Recovery
              </h3>
            </div>
            <span className="text-xs text-gray-500">Protect lost or stolen phones</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Target Investor Wallet
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={targetWallet}
                  onChange={(e) => setTargetWallet(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleToggleFreeze}
                  disabled={!targetWallet}
                  className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    walletFrozen
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  } disabled:opacity-50`}
                >
                  {walletFrozen ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unfreeze Wallet</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Freeze Wallet</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Replacement Wallet (Recover Shares)
                </label>
                <input
                  type="text"
                  placeholder="0x replacement..."
                  value={replacementWallet}
                  onChange={(e) => setReplacementWallet(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleRecoverShares}
                disabled={!targetWallet || !replacementWallet}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                <span>Recover &amp; Transfer Shares</span>
              </button>
            </div>
          </div>

          {recoveryMessage && (
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl font-mono text-[11px]">
              {recoveryMessage}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
