"use client";

import React from "react";
import {
  Terminal,
  Database,
  Cloud,
  GitBranch,
  Bug,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Code2,
  TestTube,
  Settings,
  RefreshCw,
  Layers,
  Package,
  Shield,
  Monitor
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const DEV_NAV_ITEMS = [
  { label: "System Overview", icon: Monitor, href: "/dev" },
  { label: "Services", icon: Server, href: "/dev/services" },
  { label: "Database", icon: Database, href: "/dev/database" },
  { label: "API Endpoints", icon: Cloud, href: "/dev/api" },
  { label: "AI Models", icon: Cpu, href: "/dev/models" },
  { label: "Logs & Debug", icon: Terminal, href: "/dev/logs" },
  { label: "Performance", icon: Activity, href: "/dev/performance" },
  { label: "Deployments", icon: GitBranch, href: "/dev/deploy" },
  { label: "Testing", icon: TestTube, href: "/dev/testing" },
];

export function DevSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-200 bg-white hidden lg:flex flex-col justify-between h-full shrink-0">
      {/* Developer Profile Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
          Lead Developer
        </div>
        <div className="flex items-center gap-2 text-sm text-black font-medium">
          <Code2 className="w-4 h-4 text-gray-600" />
          <span>Shawn The Creator</span>
        </div>
        <div className="text-[9px] font-mono text-gray-500 mt-1">
          GridGuard AI • Access Level: Root
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scroll p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
          DevOps Tools
        </div>
        {DEV_NAV_ITEMS.map((item) => {
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

      {/* System Status */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-mono">BUILD STATUS</span>
            <span className="text-[10px] text-gray-700 font-mono">PASSING</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-mono">LAST DEPLOY</span>
            <span className="text-[10px] text-black font-mono">2h ago</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 h-full rounded-full w-[100%]"></div>
          </div>
          <div className="text-[8px] text-gray-500 font-mono mt-1 text-center">
            All Systems Operational
          </div>
        </div>
      </div>
    </aside>
  );
}
