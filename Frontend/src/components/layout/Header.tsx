"use client";

import React, { useState, useEffect } from "react";
import { Bell, Search, User, LogOut, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface SolarAssetSearchItem {
  id: string;
  type: string;
  location: string;
}

const SOLAR_ASSETS: SolarAssetSearchItem[] = [
  { id: "BLOCK-A", type: "10 kWp Solar Mini-Grid", location: "Block A, Gauteng" },
  { id: "METER-01", type: "ESP32 Meter Oracle", location: "Block A Central Inverter" },
  { id: "SSBA", type: "SolarShare Token (3,500 shares)", location: "Base Sepolia Public Record Book" },
];

export function Header() {
  const router = useRouter();
  const { showToast } = useToast();

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SolarAssetSearchItem[]>([]);

  // Search Logic
  useEffect(() => {
    if (searchQuery.length > 0) {
      const results = SOLAR_ASSETS.filter(asset =>
        asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem("solarshare_token");
    localStorage.removeItem("solarshare_user");
    document.cookie = "solarshare_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "solarshare_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    showToast("Session Terminated", "info");
    setTimeout(() => router.push("/login"), 1000);
  };

  const handleAssetClick = (id: string) => {
    setSearchQuery(""); // Clear search
    router.push("/solar");
  };

  return (
    <header className="w-full h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 relative z-50 shrink-0">

      {/* Brand / Left */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center group-hover:bg-amber-600 transition-colors shadow-xs">
            <Sun className="w-5 h-5" />
          </div>
          <h1 className="font-bold tracking-tight text-black text-sm">
            Solar<span className="text-amber-600 font-semibold">Share</span>{" "}
            <span className="text-gray-500 font-normal">Console</span>
          </h1>
        </Link>
      </div>

      {/* Center Search - Functional */}
      <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative group w-96">
          <input
            type="text"
            placeholder="Search solar asset ID (e.g. TR-03)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-9 pr-24 text-xs text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 w-full transition-all placeholder:text-gray-400 font-mono"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-gray-600 transition-colors" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <span className="text-[10px] text-gray-400 font-mono border border-gray-200 rounded px-1.5 py-0.5 bg-white">
              CTRL K
            </span>
          </div>

          {/* Search Results Dropdown */}
          {searchQuery && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-100">
              {searchResults.length > 0 ? (
                searchResults.map(asset => (
                  <div
                    key={asset.id}
                    onClick={() => handleAssetClick(asset.id)}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <div className="text-xs text-black font-bold font-mono">{asset.id}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{asset.type} • {asset.location}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-xs text-gray-500 text-center font-mono">No assets found matching query.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-px bg-gray-200 mx-1"></div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full border-2 border-white"></span>
          </button>

          {isNotifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">System Alerts</span>
                  <span className="text-[10px] text-gray-600 cursor-pointer hover:underline">Mark all read</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                      <div className="text-xs text-black font-bold group-hover:text-gray-700 transition-colors">TR-03 Meter Reading</div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">ESP32 signed reading received and verified.</div>
                    <div className="text-[9px] text-gray-400 mt-1">2 mins ago</div>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <div className="text-xs text-black font-bold group-hover:text-gray-700 transition-colors">Payout Ready</div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">Monthly revenue distribution cycle verified.</div>
                    <div className="text-[9px] text-gray-400 mt-1">1 hour ago</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-gray-200 mx-1"></div>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsNotifOpen(false); }}
            className="flex items-center gap-2 pl-1 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 border border-amber-400 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              OP
            </div>
          </button>

          {isUserMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="text-xs text-black font-bold">SolarShare Operator</div>
                  <div className="text-[10px] text-gray-500 font-mono">Role: Operator</div>
                </div>
                <Link
                  href="/solar/operator"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-600 hover:text-black hover:bg-gray-50 transition-colors"
                >
                  <User className="w-3.5 h-3.5" /> Operator Console
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 text-left transition-colors border-t border-gray-100"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
