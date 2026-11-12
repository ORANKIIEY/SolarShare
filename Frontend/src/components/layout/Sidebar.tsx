"use client";

import React from "react";
import {
  Map,
  Activity,
  Zap,
  LayoutDashboard,
  Settings,
  FolderOpen,
  Server
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Mission Control", icon: Map, href: "/admin" },
  { label: "Live Telemetry", icon: Activity, href: "/admin/telemetry" },
  { label: "Theft Alerts", icon: Zap, href: "/admin/alerts" },
  { label: "Grid Assets", icon: Server, href: "/admin/assets" },
  { label: "System Config", icon: Settings, href: "/admin/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-200 bg-white hidden lg:flex flex-col justify-between h-full shrink-0">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-gray-200">
        <div className="text-sm font-bold text-black">Admin Console</div>
      </div>

      {/* Context Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="text-[10px] font-mono text-black uppercase tracking-wider mb-2">
          Current Operation
        </div>
        <div className="flex items-center gap-2 text-sm text-black font-medium">
          <FolderOpen className="w-4 h-4 text-gray-600" />
          <span>Sector 4: Ekurhuleni</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scroll p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
          Modules
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors group",
                isActive
                  ? "bg-gray-100 text-black border border-gray-300"
                  : "text-black hover:bg-gray-100"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-black" : "text-gray-500 group-hover:text-black"
                )}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Load Widget */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 font-mono">SERVER LOAD</span>
            <span className="text-[10px] text-black font-mono">82%</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gray-600 h-full rounded-full w-[82%]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}