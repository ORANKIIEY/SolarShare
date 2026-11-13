"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sun,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Coins,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";

export default function SolarAssetPage() {
  const [shareCount, setShareCount] = useState(5);
  const [isBuying, setIsBuying] = useState(false);
  const [buySuccess, setBuySuccess] = useState(false);

  // Constants
  const PRICE_PER_SHARE_ZAR = 100;
  const PRICE_PER_SHARE_USDC = 5;
  const MAX_SHARES = 3500;
  const SHARES_SOLD = 2140;
  const SHARES_REMAINING = MAX_SHARES - SHARES_SOLD;

  const totalCostZar = shareCount * PRICE_PER_SHARE_ZAR;
  const totalCostUsdc = shareCount * PRICE_PER_SHARE_USDC;

  const handleSimulateBuy = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBuying(true);
    setTimeout(() => {
      setIsBuying(false);
      setBuySuccess(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Solar<span className="text-amber-600">Share</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                Investor Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/solar/debug"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>Live Onchain State</span>
            </Link>
            <Link
              href="/operator"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
            >
              Operator Console →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb & Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
            <Link href="/" className="hover:text-amber-600">Home</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Block A Mini-Grid</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Block A Solar Mini-Grid
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Gauteng, South Africa • 10 kWp Rooftop System powering 20 Homes &amp; 5 Spaza Shops
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Meter Status: OK · Payouts Active</span>
            </div>
          </div>
        </div>

        {/* ── Key Metrics Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">Share Price</div>
            <div className="mt-1 text-2xl font-black text-gray-900">R100</div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">$5.00 USDC</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">Shares Available</div>
            <div className="mt-1 text-2xl font-black text-gray-900">{SHARES_REMAINING.toLocaleString()}</div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">of 3,500 max cap</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">Electricity Sold</div>
            <div className="mt-1 text-2xl font-black text-gray-900">8,100 kWh</div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">verified by meter oracle</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-xs font-medium text-gray-500">Monthly Payouts</div>
            <div className="mt-1 text-2xl font-black text-emerald-600">Active</div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">Next cycle: end of month</div>
          </div>
        </div>

        {/* ── Two Column Content (Asset Details & Purchase Form) ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Details & Legal Documents */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visual Panel Info */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-gray-900">System Specifications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Solar Array Rating</div>
                  <div className="font-bold text-gray-900 mt-0.5">10 kWp Monocrystalline</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Inverter &amp; Battery</div>
                  <div className="font-bold text-gray-900 mt-0.5">15 kWh Lithium Storage</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Customer Prepayment</div>
                  <div className="font-bold text-gray-900 mt-0.5">Smart Prepaid Token Meters</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Hardware Telemetry</div>
                  <div className="font-bold text-gray-900 mt-0.5">ESP32 ECDSA Secp256k1 Signed</div>
                </div>
              </div>
            </div>

            {/* Legal Documents */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Legal Documents &amp; SPV Proof</h2>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  SHA-256 Verified
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Each document is permanently recorded onchain. Download any document and verify its cryptographic hash matches the smart contract:
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">SPV Company Certificate</div>
                      <div className="text-[11px] font-mono text-gray-500 truncate max-w-xs sm:max-w-md">
                        Hash: 0xcb20f0acb3738a25704cc7c4af042cc370725882d74709d8a0d80bd434a4ea6e
                      </div>
                    </div>
                  </div>
                  <a
                    href="https://raw.githubusercontent.com/ORANKIIEY/SolarShare/main/docs/asset-documents/spv-company-certificate.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0"
                  >
                    <span>View PDF</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">Electrical CoC Certificate</div>
                      <div className="text-[11px] font-mono text-gray-500 truncate max-w-xs sm:max-w-md">
                        Hash: 0xe213316404dfa5dba8a3eaffd6faf5d7f87870e720f853cca27c9be299875ac8
                      </div>
                    </div>
                  </div>
                  <a
                    href="https://raw.githubusercontent.com/ORANKIIEY/SolarShare/main/docs/asset-documents/installation-certificate.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0"
                  >
                    <span>View PDF</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">Power Purchase Agreement (PPA)</div>
                      <div className="text-[11px] font-mono text-gray-500 truncate max-w-xs sm:max-w-md">
                        Hash: 0xfb9f4b13181b0110050039019a05d53207468f4f8c6a5b1358db9939f35b5f81
                      </div>
                    </div>
                  </div>
                  <a
                    href="https://raw.githubusercontent.com/ORANKIIEY/SolarShare/main/docs/asset-documents/power-purchase-agreement.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0"
                  >
                    <span>View PDF</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Buy Shares Form */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Buy Shares
                </span>
                <span className="text-xs text-gray-500">Whole shares only</span>
              </div>

              {buySuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">You are a Co-Owner!</h3>
                  <p className="text-xs text-gray-600">
                    You have purchased <strong>{shareCount} shares</strong> (R{totalCostZar}). Your shares and monthly payout schedule are active.
                  </p>
                  <button
                    onClick={() => setBuySuccess(false)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  >
                    Buy More Shares
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSimulateBuy} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Number of Shares
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShareCount(Math.max(1, shareCount - 1))}
                        className="w-10 h-10 rounded-lg border border-gray-300 font-bold text-lg hover:bg-gray-100 flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={SHARES_REMAINING}
                        value={shareCount}
                        onChange={(e) => setShareCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 h-10 text-center font-bold text-lg bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShareCount(Math.min(SHARES_REMAINING, shareCount + 1))}
                        className="w-10 h-10 rounded-lg border border-gray-300 font-bold text-lg hover:bg-gray-100 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price per share:</span>
                      <span className="font-semibold text-gray-900">R100 ($5 USDC)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total investment:</span>
                      <span className="font-black text-amber-900 text-sm">R{totalCostZar} (${totalCostUsdc} USDC)</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-amber-200/50">
                      <span>Ownership portion:</span>
                      <span>{((shareCount / MAX_SHARES) * 100).toFixed(2)}%</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isBuying}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isBuying ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing Purchase...
                      </span>
                    ) : (
                      <>
                        <span>Invest R{totalCostZar}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>Pay with EFT, Card or Mobile Money</span>
                  </div>
                </form>
              )}
            </div>

            {/* Plain-Language Risk Reminder */}
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-orange-900">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Before you buy</span>
              </div>
              <p className="leading-relaxed text-orange-800 text-[11px]">
                Clean energy payouts fluctuate with seasonal sunshine. While the cryptographic meter protects against theft, shares represent physical assets and are not bank-guaranteed savings.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
