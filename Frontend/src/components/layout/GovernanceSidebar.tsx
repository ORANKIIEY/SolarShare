"use client";

import React from "react";
import {
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  FileText,
  Settings,
  Calendar,
  Shield,
  Target,
  PieChart,
  Activity
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const GOVERNANCE_NAV_ITEMS = [
  { label: "Executive Dashboard", icon: BarChart3, href: "/governance" },
  { label: "Worker Management", icon: Users, href: "/governance/workers" },
  { label: "Financial Analytics", icon: DollarSign, href: "/governance/financial" },
  { label: "Sector Performance", icon: Target, href: "/governance/sectors" },
  { label: "Risk Assessment", icon: AlertTriangle, href: "/governance/risk" },
  { label: "Compliance Reports", icon: FileText, href: "/governance/compliance" },
  { label: "Strategic Planning", icon: Calendar, href: "/governance/planning" },
];

export function GovernanceSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-surface hidden lg:flex flex-col justify-between h-full shrink-0">
      {/* Manager Profile Header */}
      <div className="p-4 border-b border-border">
        <div className="text-[10px] font-mono text-dim uppercase tracking-wider mb-2">
          Municipal Manager
        </div>
        <div className="flex items-center gap-2 text-sm text-text-main font-medium">
          <Shield className="w-4 h-4 text-acid" />
          <span>Patrick Nkosi</span>
        </div>
        <div className="text-[9px] font-mono text-dim mt-1">
          City of Ekurhuleni • Access Level: Executive
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scroll p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono text-dim uppercase tracking-wider">
          Governance Tools
        </div>
        {GOVERNANCE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors group",
                isActive
                  ? "bg-white/5 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-acid" : "text-dim group-hover:text-acid"
                )}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Performance */}
      <div className="p-4 border-t border-border">
        <div className="bg-panel rounded border border-border p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-zinc-400 font-mono">SYSTEM HEALTH</span>
            <span className="text-[10px] text-acid font-mono">OPTIMAL</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-zinc-400 font-mono">CITY COVERAGE</span>
            <span className="text-[10px] text-white font-mono">87.3%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-danger via-yellow-400 to-acid h-full rounded-full w-[87.3%] shadow-[0_0_10px_rgba(204,255,0,0.3)]"></div>
          </div>
          <div className="text-[8px] text-zinc-500 font-mono mt-1 text-center">
            4 Sectors Active
          </div>
        </div>
      </div>
    </aside>
  );
}
