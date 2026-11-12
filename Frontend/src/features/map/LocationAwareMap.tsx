"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LocationAwareMapProps {
  onPoleClick?: (id: string) => void;
  assignedArea?: {
    coordinates: {
      center: { lat: number; lng: number };
      bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
    };
    name: string;
    province: string;
  };
  className?: string;
}

export default function LocationAwareMap({ 
  onPoleClick, 
  assignedArea, 
  className 
}: LocationAwareMapProps) {
  const mapSrc = assignedArea 
    ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2d!2d${assignedArea.coordinates.center.lng}!3d${assignedArea.coordinates.center.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!6m8!1e3!2e2!3e2!4e2!5e1!6e1!7e100!8e0!5m1!1e1!3e1!5e1!7e100!8e0&maptype=satellite&view=3d`
    : `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d11458.21415614211!2d28.0473!3d-26.2041!2m3!1f0!2f39.2!3f0!3m2!1i1024!2i768!4f35!5e1!3m2!1sen!2sza!4v1710425000000!5m2!1sen!2sza&maptype=satellite&view=3d`;

  return (
    <div className={cn("relative w-full h-96 bg-void rounded-lg overflow-hidden border border-acid/20 group", className)}>
      {/* Location Badge */}
      {assignedArea && (
        <div className="absolute top-4 left-4 z-10 bg-surface/90 backdrop-blur-sm border border-acid/30 rounded-lg px-3 py-2">
          <div className="text-xs font-mono text-acid uppercase tracking-wider">
            {assignedArea.name}
          </div>
          <div className="text-[9px] font-mono text-dim">
            {assignedArea.province}
          </div>
        </div>
      )}

      {/* Restricted Area Notice */}
      {assignedArea && (
        <div className="absolute top-4 right-4 z-10 bg-panel/90 backdrop-blur-sm border border-yellow-400/30 rounded-lg px-3 py-2 max-w-[200px]">
          <div className="text-xs font-mono text-yellow-400 uppercase tracking-wider">
            Restricted Area
          </div>
          <div className="text-[9px] font-mono text-dim">
            Only {assignedArea.name} poles visible
          </div>
        </div>
      )}

      {/* Map Iframe */}
      <iframe 
        src={mapSrc}
        className="w-full h-full border-0"
        allowFullScreen
        loading="lazy"
        title={`GridGuard Map - ${assignedArea?.name || 'South Africa'}`}
      />

      {/* Simulated Pole Markers */}
      {assignedArea && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Simulated pole locations within the assigned area */}
          <div 
            className="absolute w-3 h-3 bg-danger rounded-full shadow-lg shadow-danger/50 animate-pulse cursor-pointer pointer-events-auto"
            style={{ 
              top: '30%', 
              left: '25%',
              transform: 'translate(-50%, -50%)'
            }}
            onClick={() => onPoleClick?.('P-402')}
            title="Pole P-402 - Critical Alert"
          />
          <div 
            className="absolute w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 cursor-pointer pointer-events-auto"
            style={{ 
              top: '60%', 
              left: '70%',
              transform: 'translate(-50%, -50%)'
            }}
            onClick={() => onPoleClick?.('P-318')}
            title="Pole P-318 - Maintenance Required"
          />
          <div 
            className="absolute w-3 h-3 bg-acid rounded-full shadow-lg shadow-acid/50 cursor-pointer pointer-events-auto"
            style={{ 
              top: '45%', 
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            onClick={() => onPoleClick?.('P-215')}
            title="Pole P-215 - Normal Operation"
          />
        </div>
      )}

      {/* No Location State */}
      {!assignedArea && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-acid font-mono mb-2">Location Required</div>
            <div className="text-dim text-sm font-mono">
              Enable location services to see your assigned work area
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
