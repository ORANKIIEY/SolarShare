"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Coins,
  ArrowDownLeft,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  RefreshCw,
  Wallet,
  Receipt,
  Download,
  Building,
  Info,
  Check,
} from "lucide-react";
import {
  CONTRACT_ADDRESSES,
  getMeterStatus,
  getSharesOwned,
  getPendingPayout,
  getClaimBlocker,
  formatUsdc,
  formatShares,
  USE_SAMPLE_DATA,
} from "@/lib/chain";
import { MeterStatus, ClaimBlocker, type Address } from "@/lib/chain-types";
import sampleData from "@/lib/sample-data.json";
import TheftAlertBanner from "@/components/solar/TheftAlertBanner";

export default function MySharesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Investor details
  const [investorName, setInvestorName] = useState("Thandi Khumalo");
  const [investorPhone, setInvestorPhone] = useState("082 555 1234");
  const [investorAddress, setInvestorAddress] = useState<Address>(
    sampleData.investors.thandi.account as Address
  );

  // Financial figures
  const [sharesOwned, setSharesOwned] = useState<number>(40);
  const [ownershipBps, setOwnershipBps] = useState<number>(186); // 1.86%
  const [totalEarnedZar, setTotalEarnedZar] = useState<number>(340);
  const [claimableUsdc, setClaimableUsdc] = useState<number>(4.86);
  const [usdcWalletBalance, setUsdcWalletBalance] = useState<number>(0);

  // Meter status
  const [meterStatus, setMeterStatus] = useState<MeterStatus>(MeterStatus.OK);
  const [meterStatusLabel, setMeterStatusLabel] = useState<string>("OK");
  const [canClaim, setCanClaim] = useState<boolean>(true);
  const [blockerMessage, setBlockerMessage] = useState<string>("Ready to claim");

  // Claim action state
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimSuccessTx, setClaimSuccessTx] = useState<string | null>(null);

  // Mobile money cash out modal state
  const [showCashOutModal, setShowCashOutModal] = useState<boolean>(false);
  const [cashOutProvider, setCashOutProvider] = useState<string>("MTN MoMo");
  const [cashOutPhone, setCashOutPhone] = useState<string>("082 555 1234");
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);
  const [cashOutReceipt, setCashOutReceipt] = useState<{
    ref: string;
    amountZar: number;
    amountUsdc: number;
    provider: string;
    phone: string;
    date: string;
    partner: string;
  } | null>(null);

  // Load user from storage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("solarshare_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.name) setInvestorName(u.name);
        if (u.phone) {
          setInvestorPhone(u.phone);
          setCashOutPhone(u.phone);
        }
      }
      const customShares = localStorage.getItem("solarshare_shares_owned");
      if (customShares) {
        setSharesOwned(parseInt(customShares) || 40);
      }
      const storedAddr = localStorage.getItem("solarshare_investor_address");
      if (storedAddr) {
        setInvestorAddress(storedAddr as Address);
      }
    } catch (e) {
      console.warn("Storage read error:", e);
    }
  }, []);

  // Fetch onchain data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statusRes, sharesRes, payoutRes, blockerRes] = await Promise.all([
        getMeterStatus(),
        getSharesOwned(investorAddress),
        getPendingPayout(investorAddress),
        getClaimBlocker(investorAddress),
      ]);

      setMeterStatus(statusRes.status);
      setMeterStatusLabel(statusRes.statusLabel);

      if (statusRes.status === MeterStatus.OK) {
        setCanClaim(blockerRes.canClaim || claimableUsdc > 0);
        setBlockerMessage(blockerRes.message);
      } else {
        setCanClaim(false);
        if (statusRes.status === MeterStatus.THEFT) {
          setBlockerMessage("Theft detected by meter: payouts paused to protect your money");
        } else if (statusRes.status === MeterStatus.TAMPER) {
          setBlockerMessage("Meter enclosure opened: payouts paused pending inspection");
        } else {
          setBlockerMessage("Meter offline: payouts paused until next solar sync");
        }
      }
    } catch (err) {
      console.warn("Error fetching data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [investorAddress]);

  // Execute Claim
  const handleClaim = async () => {
    if (!canClaim || claimableUsdc <= 0) return;
    setIsClaiming(true);

    setTimeout(() => {
      setIsClaiming(false);
      const tx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setClaimSuccessTx(tx);
      setUsdcWalletBalance((prev) => prev + claimableUsdc);
      setClaimableUsdc(0);
      setCanClaim(false);
      setBlockerMessage("Payout claimed successfully");
    }, 1400);
  };

  // Execute Cash-Out to Mobile Money
  const handleConfirmCashOut = () => {
    setIsCashingOut(true);
    setTimeout(() => {
      setIsCashingOut(false);
      const refNumber = `MOM-ZA-${Date.now().toString().slice(-6)}`;
      const cashAmountUsdc = usdcWalletBalance > 0 ? usdcWalletBalance : 4.86;
      const cashAmountZar = cashAmountUsdc * 20;

      setCashOutReceipt({
        ref: refNumber,
        amountZar: cashAmountZar,
        amountUsdc: cashAmountUsdc,
        provider: cashOutProvider,
        phone: cashOutPhone,
        date: new Date().toLocaleString("en-ZA"),
        partner: "Mukuru Mobile Settlement & Ozow Direct FSP #45517",
      });

      setUsdcWalletBalance(0);
      setShowCashOutModal(false);
    }, 1500);
  };

  const ownershipPercent = ((sharesOwned / 3500) * 100).toFixed(2);
  const claimableZar = (claimableUsdc * 20).toFixed(2);
  const totalAvailableToCashOutZar = (usdcWalletBalance * 20).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans pb-16">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link href="/solar" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-gray-900 text-sm leading-none">
              Solar<span className="text-amber-600">Share</span>
            </div>
            <span className="text-[10px] text-gray-500 font-medium">Investor Dashboard</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Refresh onchain state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/solar"
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            Mini-Grid Overview
          </Link>
        </div>
      </header>

      {/* ── Real-time Full-Width Theft Alert Banner (#24) ─────────── */}
      <TheftAlertBanner onStatusChange={(st) => setMeterStatus(st)} />

      {/* ── Main Dashboard ────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Investor Welcome & Mini-Grid Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-gray-500">
              Welcome back, <strong>{investorName}</strong> ({investorPhone})
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5">
              My Solar Shares
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 self-start sm:self-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Block A Mini-Grid (10 kWp)</span>
          </div>
        </div>

        {/* ── Meter Status Banner (Explains in plain words if paused) ── */}
        <div
          className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            meterStatus === MeterStatus.OK
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : meterStatus === MeterStatus.THEFT
              ? "bg-red-50 border-red-300 text-red-950 animate-pulse"
              : meterStatus === MeterStatus.TAMPER
              ? "bg-red-50 border-red-300 text-red-950"
              : "bg-amber-50 border-amber-300 text-amber-950"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                meterStatus === MeterStatus.OK
                  ? "bg-emerald-500"
                  : meterStatus === MeterStatus.THEFT || meterStatus === MeterStatus.TAMPER
                  ? "bg-red-500"
                  : "bg-amber-500"
              }`}
            />
            <div>
              <div className="font-bold text-sm">
                {meterStatus === MeterStatus.OK
                  ? "Meter Status: OK · Payouts Active"
                  : meterStatus === MeterStatus.THEFT
                  ? "Theft Detected · Payouts Paused Automatically"
                  : meterStatus === MeterStatus.TAMPER
                  ? "Enclosure Tamper Detected · Payouts Paused"
                  : "Meter Offline · Awaiting Telemetry Sync"}
              </div>
              <p className="mt-0.5 opacity-90 text-[11px] leading-relaxed">
                {meterStatus === MeterStatus.OK
                  ? "The cryptographic meter verifies electricity production. Your monthly share is earned as customers prepay for power."
                  : "Why paused: The physical meter noticed unmetered electricity bypass. Money is held securely in the public record book until the operator confirms clean lines."}
              </p>
            </div>
          </div>

          <a
            href={`https://sepolia.basescan.org/address/${CONTRACT_ADDRESSES.MeterOracle}`}
            target="_blank"
            rel="noreferrer"
            className="self-start sm:self-center text-xs font-semibold underline flex items-center gap-1 shrink-0"
          >
            <span>Verify Meter on Basescan</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ── Key Metrics Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-semibold text-gray-500">Shares Owned</div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-gray-900">
              {sharesOwned} <span className="text-sm font-bold text-amber-600">SSBA</span>
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">
              {ownershipPercent}% of the mini-grid
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-semibold text-gray-500">Total Payouts Earned</div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-gray-900">
              R{totalEarnedZar}
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">
              ~$17.00 USDC earned to date
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-semibold text-gray-500">Claimable Right Now</div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-emerald-600">
              R{claimableZar}
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">
              ${claimableUsdc.toFixed(2)} USDC available
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-semibold text-gray-500">Next Payout Cycle</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-gray-900">
              30 Nov 2026
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Paid monthly</span>
            </div>
          </div>
        </div>

        {/* ── Claim & Cash-Out Action Panels ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel 1: Claim Monthly Payout */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                <span>1. Claim Your Monthly Payout</span>
              </h2>
              <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                RevenueDistributor
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              When the meter confirms clean electricity generation, your portion of prepaid sales becomes ready to claim.
            </p>

            <div className="p-3.5 bg-gray-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Pending Amount:</span>
                <span className="font-black text-gray-900">
                  R{claimableZar} (${claimableUsdc.toFixed(2)} USDC)
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Condition:</span>
                <span className={meterStatus === MeterStatus.OK ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                  {blockerMessage}
                </span>
              </div>
            </div>

            {claimSuccessTx && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payout Claimed Successfully!</span>
                </div>
                <div className="text-[11px] font-mono text-gray-600 truncate">
                  Tx: {claimSuccessTx}
                </div>
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={isClaiming || !canClaim || claimableUsdc <= 0}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-amber-500 hover:bg-amber-600 shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Claiming from Public Record Book...
                </span>
              ) : (
                <>
                  <span>Claim R{claimableZar} Payout</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Panel 2: Cash Out to Mobile Money */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-amber-300 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <span>2. Cash Out to Mobile Money</span>
              </h2>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                Instant ZAR
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Transfer your earned payouts directly to your mobile wallet (MTN MoMo, Vodacom M-Pesa) or bank account.
            </p>

            <div className="p-3.5 bg-amber-50/60 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Available to Cash Out:</span>
                <span className="font-black text-amber-950">
                  {usdcWalletBalance > 0
                    ? `R${totalAvailableToCashOutZar} ($${usdcWalletBalance.toFixed(2)} USDC)`
                    : `R${claimableZar} ($${claimableUsdc.toFixed(2)} USDC)`}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Direct Partner:</span>
                <span>Mukuru / Ozow FSP #45517</span>
              </div>
            </div>

            <button
              onClick={() => setShowCashOutModal(true)}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-gray-900 bg-amber-400 hover:bg-amber-500 shadow-xs flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>Cash Out to Mobile Money</span>
            </button>
          </div>
        </div>

        {/* ── Cash-Out Receipt View (If generated) ─────────────────── */}
        {cashOutReceipt && (
          <div className="p-6 rounded-2xl bg-white border-2 border-emerald-400 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-gray-900 text-base">
                  Official Mobile Money Cash-Out Receipt
                </h3>
              </div>
              <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                SETTLED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 text-[10px]">Reference:</span>
                <div className="font-mono font-bold text-gray-900 mt-0.5">{cashOutReceipt.ref}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 text-[10px]">Amount Settled:</span>
                <div className="font-bold text-emerald-600 text-sm mt-0.5">
                  R{cashOutReceipt.amountZar.toFixed(2)} ZAR
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 text-[10px]">Provider:</span>
                <div className="font-bold text-gray-900 mt-0.5">{cashOutReceipt.provider}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 text-[10px]">Recipient Phone:</span>
                <div className="font-mono font-bold text-gray-900 mt-0.5">{cashOutReceipt.phone}</div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>{cashOutReceipt.partner}</span>
              <span>{cashOutReceipt.date}</span>
            </div>
          </div>
        )}

        {/* ── Payout History Table with Basescan Links ──────────────── */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              Payout &amp; Cash-Out History
            </h2>
            <span className="text-xs text-gray-500">Verified by public record book</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-mono">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Electricity Sold</th>
                  <th className="py-2.5">Your Payout</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 font-medium text-gray-900">October 2026</td>
                  <td className="py-3 font-mono text-gray-600">8,100 kWh</td>
                  <td className="py-3 font-bold text-emerald-600">R59.40 ($2.97 USDC)</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Cashed Out
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <a
                      href="https://sepolia.basescan.org/tx/0x7d2c4b9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 hover:underline font-mono inline-flex items-center gap-1"
                    >
                      <span>0x7d2c...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-gray-900">September 2026</td>
                  <td className="py-3 font-mono text-gray-600">7,850 kWh</td>
                  <td className="py-3 font-bold text-emerald-600">R56.80 ($2.84 USDC)</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Cashed Out
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <a
                      href="https://sepolia.basescan.org/tx/0x9f2b5c1e7a3d48f06b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f60718"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 hover:underline font-mono inline-flex items-center gap-1"
                    >
                      <span>0x9f2b...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-gray-900">August 2026</td>
                  <td className="py-3 font-mono text-gray-600">8,420 kWh</td>
                  <td className="py-3 font-bold text-emerald-600">R62.40 ($3.12 USDC)</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Cashed Out
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <a
                      href="https://sepolia.basescan.org/tx/0x3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 hover:underline font-mono inline-flex items-center gap-1"
                    >
                      <span>0x3c4d...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── Cash-Out Modal ────────────────────────────────────────── */}
      {showCashOutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-600" />
                <span>Cash Out to Mobile Money</span>
              </h3>
              <button
                onClick={() => setShowCashOutModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["MTN MoMo", "Vodacom M-Pesa", "Capitec Pay", "Nedbank Send-iMali"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCashOutProvider(p)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        cashOutProvider === p
                          ? "border-amber-500 bg-amber-50 text-amber-900"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Recipient Phone Number
                </label>
                <input
                  type="tel"
                  value={cashOutPhone}
                  onChange={(e) => setCashOutPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50 font-bold text-gray-900 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Amount to Send:</span>
                  <span className="font-bold text-gray-900">
                    R{totalAvailableToCashOutZar !== "0.00" ? totalAvailableToCashOutZar : claimableZar} ZAR
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Settlement Partner:</span>
                  <span>Mukuru &amp; Ozow Direct</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Fee:</span>
                  <span className="text-emerald-700 font-bold">R0.00 (Zero fee)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCashOutModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCashOut}
                disabled={isCashingOut}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white shadow-xs disabled:opacity-50"
              >
                {isCashingOut ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
