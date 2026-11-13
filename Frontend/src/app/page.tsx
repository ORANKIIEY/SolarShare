"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sun,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Coins,
  Building2,
  AlertTriangle,
  Smartphone,
  Lock,
  FileCheck,
  Menu,
  X,
  CreditCard,
  UserCheck,
  Eye,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-200 group-hover:scale-105 transition-transform">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Solar<span className="text-amber-600">Share</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                Township Clean Energy
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">
              How it works
            </a>
            <a href="#how-to-buy" className="hover:text-gray-900 transition-colors">
              7 steps to invest
            </a>
            <a href="#where-money-goes" className="hover:text-gray-900 transition-colors">
              Where your money goes
            </a>
            <a href="#trust" className="hover:text-gray-900 transition-colors">
              Why trust us
            </a>
            <a href="#risks" className="hover:text-gray-900 transition-colors">
              Risks
            </a>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/solar"
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg shadow-sm shadow-amber-200 transition-all hover:shadow-md"
            >
              <span>View Solar Projects</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-gray-200 bg-white px-4 pt-2 pb-6 space-y-3">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-gray-700 hover:text-amber-600"
            >
              How it works
            </a>
            <a
              href="#how-to-buy"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-gray-700 hover:text-amber-600"
            >
              7 steps to invest
            </a>
            <a
              href="#where-money-goes"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-gray-700 hover:text-amber-600"
            >
              Where your money goes
            </a>
            <a
              href="#trust"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-gray-700 hover:text-amber-600"
            >
              Why trust us
            </a>
            <a
              href="#risks"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-gray-700 hover:text-amber-600"
            >
              Risks
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/solar"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-lg shadow-sm"
              >
                View Solar Projects
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-sm font-semibold border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-to-b from-amber-50/70 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium mb-6">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Community Solar Co-Ownership in South Africa
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight sm:leading-tight">
              Co-own township solar panels.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                Earn cash every month.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              You buy a small piece of a solar power system in a township, and every month you get a share of the money the system makes from selling clean electricity to nearby homes and spaza shops.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/solar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg transition-all"
              >
                <span>Explore Block A Mini-Grid</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-to-buy"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 shadow-sm transition-all"
              >
                <span>How to buy on your phone</span>
              </a>
            </div>

            {/* Quick credibility pills */}
            <div className="mt-10 pt-8 border-t border-gray-200/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500 font-medium">Start from</div>
                <div className="text-xl font-bold text-gray-900 mt-0.5">R100</div>
                <div className="text-[11px] text-gray-500 mt-1">1 share = R100</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500 font-medium">Payouts</div>
                <div className="text-xl font-bold text-gray-900 mt-0.5">Monthly</div>
                <div className="text-[11px] text-gray-500 mt-1">Direct to bank / phone</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500 font-medium">Customers</div>
                <div className="text-xl font-bold text-gray-900 mt-0.5">25 Sites</div>
                <div className="text-[11px] text-gray-500 mt-1">20 homes & 5 spazas</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500 font-medium">Verification</div>
                <div className="text-xl font-bold text-green-700 mt-0.5">Tamper-proof</div>
                <div className="text-[11px] text-gray-500 mt-1">Public meter counts</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: 7 Steps to Invest ──────────────────────────────── */}
      <section id="how-to-buy" className="py-16 md:py-24 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
              Simple & Accessible
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-gray-900">
              How to buy (all on your phone, nothing to download)
            </h3>
            <p className="mt-3 text-base text-gray-600">
              No complicated crypto setups or high minimums. Everything runs right in your mobile web browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div>
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm mb-4">
                  1
                </span>
                <h4 className="text-base font-bold text-gray-900 mb-1">Open a shared link</h4>
                <p className="text-sm text-gray-600">
                  Click a link shared with you on WhatsApp or Facebook to open the project directly in your phone browser.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Smartphone className="w-4 h-4 text-amber-500" />
                <span>Zero app store downloads</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div>
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm mb-4">
                  2
                </span>
                <h4 className="text-base font-bold text-gray-900 mb-1">See what you are buying</h4>
                <p className="text-sm text-gray-600">
                  Inspect real photos of the solar panels, township roof locations, past electricity generated, and potential monthly earnings.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Eye className="w-4 h-4 text-amber-500" />
                <span>100% transparent solar data</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div>
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm mb-4">
                  3
                </span>
                <h4 className="text-base font-bold text-gray-900 mb-1">Quick SMS signup</h4>
                <p className="text-sm text-gray-600">
                  Enter your mobile phone number and verify with a fast 4-digit code sent via SMS.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Fast & secure login</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div>
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm mb-4">
                  4
                </span>
                <h4 className="text-base font-bold text-gray-900 mb-1">Prove who you are (KYC)</h4>
                <p className="text-sm text-gray-600">
                  Snap a clear photo of your South African ID and a selfie. Required by law to keep your funds safe and compliant.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span>Legal ownership protection</span>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div>
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm mb-4">
                  5
                </span>
                <h4 className="text-base font-bold text-gray-900 mb-1">Pick your investment</h4>
                <p className="text-sm text-gray-600">
                  Choose how many shares you want to own. For example, 5 shares at R100 each = R500 total.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Clear whole-share units</span>
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div>
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm mb-4">
                  6
                </span>
                <h4 className="text-base font-bold text-gray-900 mb-1">Pay the way you already pay</h4>
                <p className="text-sm text-gray-600">
                  Complete payment instantly with EFT, debit/credit card, or mobile money without crypto gas fees.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <span>Instant local payment</span>
              </div>
            </div>

            {/* Step 7 */}
            <div className="bg-amber-500 text-white p-6 rounded-2xl relative flex flex-col justify-between lg:col-span-2 shadow-md">
              <div>
                <span className="w-8 h-8 rounded-full bg-white text-amber-600 font-bold flex items-center justify-center text-sm mb-4">
                  7
                </span>
                <h4 className="text-xl font-bold mb-2">You are officially an owner!</h4>
                <p className="text-sm text-amber-100 leading-relaxed max-w-lg">
                  Your shares appear under &quot;My shares&quot; immediately along with the next monthly payout countdown. Every month, as the community buys prepaid power, your earnings arrive automatically.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-amber-400 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Next Step:
                </span>
                <Link
                  href="/solar"
                  className="inline-flex items-center gap-1.5 bg-white text-amber-900 text-xs sm:text-sm font-bold px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <span>Go to /solar</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Where Your Money Goes ─────────────────────────── */}
      <section id="where-money-goes" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
              Financial Transparency
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-gray-900">
              What happens with your money
            </h3>
            <p className="mt-3 text-base text-gray-600">
              Every rand is accounted for in a single dedicated company with one purpose: powering local roofs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-xs flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 border border-amber-100">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Dedicated Single-Asset Company (SPV)</h4>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                Your investment goes directly to a legal special-purpose company that owns that one solar system and nothing else. No corporate cross-debt or mixing of assets.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-xs flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-5 border border-orange-100">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Real Electricity Sold to 25 Neighbours</h4>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                The solar mini-grid powers 20 township households and 5 spaza shops. Residents buy power prepaid every day just like they always have, generating daily revenue.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-xs flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-5 border border-green-100">
                <Coins className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Monthly Net Distributions with One-Tap Payout</h4>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                Each month, after basic maintenance and insurance, all remaining profits are shared among share owners. You can transfer your payout to your bank or mobile money in one tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Why You Can Trust It ──────────────────────────── */}
      <section id="trust" className="py-16 md:py-24 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
              Built on Concrete Proof
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-gray-900">
              Why you can trust SolarShare
            </h3>
            <p className="mt-3 text-base text-gray-600">
              You do not have to trust our word. The hardware counts the units and an unchangeable record book guarantees the numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">A meter that cannot lie</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                A physical device on the solar array counts every kilowatt-hour produced and sold. It stamps each count with a digital cryptographic seal only the meter itself can create—just like a till slip that cannot be forged.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">An unchangeable public record book</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Every meter reading, share purchase, and payout is recorded permanently in a public record book that nobody can erase or edit—not even our team. Anyone can check that the cash matches the kilowatt-hours.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Automatic safety lockouts</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                If someone tampers with the meter, steals electricity, or the meter goes offline, payouts pause automatically onchain and investors are told why. Money only flows when the meter proves it was honestly earned.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Honest Risks in Plain Words ───────────────────── */}
      <section id="risks" className="py-16 md:py-24 bg-amber-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full mb-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              Honest Disclosure
            </div>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-gray-900">
              Risks, in plain words
            </h3>
            <p className="mt-3 text-base text-gray-600">
              We believe in complete honesty. Like any real-world infrastructure, community solar has risks you should understand before investing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl border border-orange-200/80 shadow-xs">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Weather variability
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Less sun means less electricity made and sold. Payouts naturally go up in sunny summer months and down during rainy or cloudy stretches.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-orange-200/80 shadow-xs">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Theft or physical damage
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Theft or equipment damage can lower income. The automated meter catches discrepancies immediately, but repairs can take time and cost money.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-orange-200/80 shadow-xs">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Not a bank savings account
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Returns are not guaranteed by a bank or government. Solar panels produce clean energy for about 20 to 25 years before needing replacement.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-orange-200/80 shadow-xs">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-gray-600" />
                Selling shares takes time
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Selling your shares to another verified investor isn&apos;t as fast as withdrawing from an ATM yet. Plan to hold your shares for the long term.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Call To Action ─────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to co-own clean township solar?
          </h3>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Check live panel performance, view the SPV documents, and buy your first share for just R100.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/solar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 shadow-lg hover:shadow-xl transition-all"
            >
              <span>Explore Block A Solar Mini-Grid</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold border border-gray-700 hover:border-gray-500 text-white transition-all"
            >
              <span>Create an Account</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 py-12 text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            <span className="font-bold text-gray-900 text-base">SolarShare</span>
            <span className="text-xs text-gray-400">© {new Date().getFullYear()} SolarShare. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-600">
            <Link href="/solar" className="hover:text-gray-900 transition-colors">
              Solar Assets
            </Link>
            <a href="#trust" className="hover:text-gray-900 transition-colors">
              Trust &amp; Verification
            </a>
            <a href="#risks" className="hover:text-gray-900 transition-colors">
              Risk Disclosure
            </a>
            <Link href="/login" className="hover:text-gray-900 transition-colors">
              Operator Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
