"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Define the shape of our props
interface TacticalMapProps {
  onPoleClick: (id: string) => void;
  isColorMode?: boolean;
  poles?: any[];
  center?: [number, number];
  zoom?: number;
}

const GRID_NODES = [
  { id: "TR-01", lat: -26.17, lng: 28.23, status: "healthy", load: 45 },
  { id: "TR-02", lat: -26.18, lng: 28.24, status: "warning", load: 88 },
  { id: "TR-03", lat: -26.16, lng: 28.22, status: "active_theft", load: 120 },
  { id: "TR-04", lat: -26.19, lng: 28.25, status: "healthy", load: 30 },
];

const STATUS_COLORS = {
  healthy: "#00cc66",
  normal: "#00cc66",
  warning: "#ffaa00",
  critical: "#ff3300",
  active_theft: "#ff3300"
};

export default function TacticalMap({ 
  onPoleClick, 
  isColorMode = false, 
  poles,
  center = [-26.17, 28.23],
  zoom = 13
}: TacticalMapProps) {
  
  useEffect(() => {
    // Leaflet icon fix for Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="w-full h-150 border border-border rounded-lg overflow-hidden relative group">
      {/* Legend Overlay */}
      <div className="absolute top-4 right-4 z-1000 bg-surface/90 backdrop-blur-md border border-border p-3 rounded font-mono text-[10px] space-y-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-zinc-400">Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-zinc-400">Thermal Stress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_#ff3300]" />
          <span className="text-white font-bold">Theft Detected</span>
        </div>
      </div>

      <MapContainer
        key={`${center[0]}-${center[1]}`}
        center={center}
        zoom={zoom}
        className={cn(
          "w-full h-full transition-all duration-700",
          !isColorMode && "grayscale-[0.8] contrast-[1.2] invert-[0.9] hue-rotate-180"
        )}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {(poles && poles.length > 0 ? poles : GRID_NODES).map((node) => (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lng]}
            radius={8}
            pathOptions={{
              fillColor: STATUS_COLORS[node.status as keyof typeof STATUS_COLORS] || "#00cc66",
              fillOpacity: 0.8,
              color: node.status === 'active_theft' || node.status === 'critical' ? '#fff' : 'transparent',
              weight: 2,
            }}
            eventHandlers={{
              click: () => {
                onPoleClick(node.id); // <--- Only fires when this specific dot is clicked
              },
            }}
          >
            <Popup className="tactical-popup">
              <div className="font-mono text-xs cursor-pointer" onClick={() => onPoleClick(node.id)}>
                <div className="font-bold border-b border-zinc-200 pb-1 mb-1">ASSET: {node.id}</div>
                <div className="text-[10px] text-acid">CLICK TO INSPECT &gt;&gt;</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}