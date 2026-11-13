"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Map as MapIcon, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// 2D Tactical Map
const TacticalMap = dynamic<any>(() => import("./TacticalMap"), {
  ssr: false,
  loading: () => <MapSkeleton label="Initialising Tactical Layer..." />
});

// 3D Digital Twin Map
const DigitalTwinMap = dynamic<any>(() => import("./DigitalTwinMap"), {
  ssr: false,
  loading: () => <MapSkeleton label="Loading Photorealistic Tiles..." />
});

function MapSkeleton({ label }: { label: string }) {
  return (
    <div className="w-full h-150 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}

export default function MapLoader(props: any) {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [isColorMode, setIsColorMode] = useState(false);

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode("2d")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all",
                viewMode === "2d" ? "bg-gray-200 text-black font-bold border border-gray-300" : "text-gray-600 hover:text-black hover:bg-gray-50"
              )}
            >
              <MapIcon className="w-3 h-3" />
              2D Tactical
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all",
                viewMode === "3d" ? "bg-gray-200 text-black font-bold border border-gray-300" : "text-gray-600 hover:text-black hover:bg-gray-50"
              )}
            >
              <Box className="w-3 h-3" />
              3D Digital Twin
            </button>
          </div>

          {/* Color/Grayscale Toggle */}
          <button
            onClick={() => setIsColorMode(!isColorMode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-widest transition-all",
              isColorMode 
                ? "bg-gray-100 border-gray-300 text-black" 
                : "bg-white border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50"
            )}
          >
            <Layers className="w-3 h-3" />
            {isColorMode ? "Realistic Color" : "Tactical Mono"}
          </button>
        </div>

        {viewMode === "3d" && (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[9px] font-mono text-gray-700 uppercase tracking-tighter">OpenStreetMap CDN Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[9px] font-mono text-gray-700 uppercase tracking-tighter">ROMA Connect Live</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gray-200/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
        {viewMode === "2d" ? (
          <TacticalMap {...props} isColorMode={isColorMode} />
        ) : (
          <DigitalTwinMap {...props} isColorMode={isColorMode} />
        )}
      </div>
    </div>
  );
}
