"use client";

import React, { useState } from "react";
import { ScrollText, Shield, Thermometer, Zap, Scissors, Truck, Brain, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EdgeEvent {
  id: string;
  timestamp: string;
  poleId: string;
  type: "block" | "detect" | "alert" | "cut" | "dispatch";
  message: string;
  reason: string;
  details?: string;
}

const MOCK_EVENTS: EdgeEvent[] = [
  {
    id: "1",
    timestamp: "14:23:05",
    poleId: "P-042",
    type: "block",
    message: "FPGA Harmonic Block Active",
    reason: "2nd harmonic >15% (transformer inrush – safe)",
    details: "Fundamental: 45.2A | H2: 7.8A (17.2%)"
  },
  {
    id: "2",
    timestamp: "14:23:10",
    poleId: "P-042",
    type: "detect",
    message: "TinyML Theft Detected",
    reason: "Confidence 96% – arcing signature match",
    details: "NN inference: 0.96 | Threshold: 0.80"
  },
  {
    id: "3",
    timestamp: "14:23:12",
    poleId: "P-042",
    type: "alert",
    message: "IEEE C57.91 Thermal Alert",
    reason: "Hot-spot = 112°C > 110°C threshold",
    details: "Top oil: 78°C | Winding: 112°C | Life left: 847 hrs"
  },
  {
    id: "4",
    timestamp: "14:23:15",
    poleId: "P-042",
    type: "cut",
    message: "Secondary Cut Executed",
    reason: "Isolated load topology – 30A contactor opened",
    details: "Contactor: OPEN | Battery backup: 12.4V | Confirm: ACK"
  },
  {
    id: "5",
    timestamp: "14:22:48",
    poleId: "P-041",
    type: "dispatch",
    message: "Crew Dispatch Requested",
    reason: "Shared secondary – auto-cut disabled",
    details: "GPS: -26.1742°, 28.2341° | ETA: 23 min"
  },
  {
    id: "6",
    timestamp: "14:22:30",
    poleId: "P-038",
    type: "block",
    message: "FPGA Harmonic Block Active",
    reason: "Capacitor switching transient – safe",
    details: "Transient: 8.3ms | Peak: 127A | Decayed: YES"
  },
  {
    id: "7",
    timestamp: "14:21:55",
    poleId: "P-035",
    type: "detect",
    message: "TinyML Theft Detected",
    reason: "Confidence 89% – resistive bypass pattern",
    details: "NN inference: 0.89 | Harmonic check: PASSED"
  }
];

const EVENT_ICONS = {
  block: { icon: Lock, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  detect: { icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  alert: { icon: Thermometer, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  cut: { icon: Scissors, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
  dispatch: { icon: Truck, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" }
};

const EVENT_LABELS = {
  block: "BLOCK",
  detect: "DETECT",
  alert: "ALERT",
  cut: "CUT",
  dispatch: "DISPATCH"
};

interface EdgeEventLogProps {
  className?: string;
  maxEvents?: number;
}

export function EdgeEventLog({ className, maxEvents = 50 }: EdgeEventLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<EdgeEvent["type"] | "all">("all");

  const filteredEvents = filter === "all" 
    ? MOCK_EVENTS 
    : MOCK_EVENTS.filter(e => e.type === filter);

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-gray-600" />
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
              Edge Decision Log
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-gray-500">LIVE</span>
          </div>
        </div>
        
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1.5">
          {(["all", "block", "detect", "alert", "cut", "dispatch"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-mono uppercase transition-colors",
                filter === type 
                  ? "bg-gray-800 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {type === "all" ? "ALL" : EVENT_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-2">
        {filteredEvents.map((event) => {
          const style = EVENT_ICONS[event.type];
          const Icon = style.icon;
          const isExpanded = expandedId === event.id;

          return (
            <div
              key={event.id}
              className={cn(
                "border rounded-lg p-2.5 transition-all cursor-pointer",
                style.border,
                style.bg,
                isExpanded && "ring-1 ring-offset-1"
              )}
              onClick={() => setExpandedId(isExpanded ? null : event.id)}
            >
              <div className="flex items-start gap-2.5">
                <div className={cn("p-1.5 rounded", style.bg)}>
                  <Icon className={cn("w-3.5 h-3.5", style.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-gray-400">{event.timestamp}</span>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", style.bg, style.color)}>
                      {EVENT_LABELS[event.type]}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">{event.poleId}</span>
                  </div>
                  
                  <p className="text-xs font-medium text-gray-800 leading-tight">
                    {event.message}
                  </p>
                  
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {event.reason}
                  </p>
                  
                  {isExpanded && event.details && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50">
                      <p className="text-[9px] font-mono text-gray-600 bg-white/50 p-1.5 rounded">
                        {event.details}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="text-gray-400">
                  <svg 
                    className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>Showing {filteredEvents.length} of {MOCK_EVENTS.length} events</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Brain className="w-3 h-3" /> TinyML
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> FPGA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
