"use client";

import React from "react";
import {
  Map,
  Wrench,
  Clock,
  Phone,
  Navigation,
  FileText,
  Settings,
  User,
  Zap
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const WORKER_NAV_ITEMS = [
  { label: "Field Dashboard", icon: Map, href: "/worker" },
  { label: "Work Orders", icon: Wrench, href: "/worker/orders" },
  { label: "Schedule", icon: Clock, href: "/worker/schedule" },
  { label: "Emergency", icon: Zap, href: "/worker/emergency" },
  { label: "Reports", icon: FileText, href: "/worker/reports" },
  { label: "Contact Dispatch", icon: Phone, href: "/worker/contact" },
];

export function WorkerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-surface hidden lg:flex flex-col justify-between h-full shrink-0">
      {/* Worker Profile Header */}
      <div className="p-4 border-b border-border">
        <div className="text-[10px] font-mono text-dim uppercase tracking-wider mb-2">
          Field Technician
        </div>
        <div className="flex items-center gap-2 text-sm text-text-main font-medium">
          <User className="w-4 h-4 text-acid" />
          <span>Thabo Mokoena</span>
        </div>
        <div className="text-[9px] font-mono text-dim mt-1">
          ID: TECH-042 | Sector 4
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scroll p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono text-dim uppercase tracking-wider">
          Field Operations
        </div>
        {WORKER_NAV_ITEMS.map((item) => {
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

      {/* Quick Status */}
      <div className="p-4 border-t border-border">
        <div className="bg-panel rounded border border-border p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-zinc-400 font-mono">SHIFT STATUS</span>
            <span className="text-[10px] text-acid font-mono">ACTIVE</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-zinc-400 font-mono">NEXT BREAK</span>
            <span className="text-[10px] text-white font-mono">14:30</span>
          </div>
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div className="bg-acid h-full rounded-full w-[65%] shadow-[0_0_10px_rgba(204,255,0,0.3)]"></div>
          </div>
          <div className="text-[8px] text-zinc-500 font-mono mt-1 text-center">
            65% Complete
          </div>
        </div>
      </div>
    </aside>
  );
}
