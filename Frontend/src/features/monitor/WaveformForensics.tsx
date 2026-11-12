"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, Download, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaveformPoint {
  time: number; // microseconds
  amplitude: number; // amperes
  isTransient: boolean;
}

interface WaveformForensicsProps {
  poleId?: string;
  className?: string;
}

// Generate realistic 200kHz ADC waveform data
function generateWaveformData(durationMs: number = 50): WaveformPoint[] {
  const sampleRate = 200000; // 200 kHz
  const samples = Math.floor((durationMs / 1000) * sampleRate);
  const data: WaveformPoint[] = [];
  
  // 60Hz fundamental + harmonics + micro-transients
  const fundamentalFreq = 60;
  const fundamentalAmp = 45; // Amperes
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate; // seconds
    const tUs = t * 1e6; // microseconds
    
    // Fundamental 60Hz
    let amplitude = fundamentalAmp * Math.sin(2 * Math.PI * fundamentalFreq * t);
    
    // 3rd harmonic (common in transformers)
    amplitude += 8 * Math.sin(2 * Math.PI * 3 * fundamentalFreq * t);
    
    // 5th harmonic
    amplitude += 4 * Math.sin(2 * Math.PI * 5 * fundamentalFreq * t);
    
    // Arcing signature: high-frequency micro-transients at random intervals
    const isTransient = Math.random() < 0.001 && t > 0.01 && t < 0.04;
    if (isTransient) {
      // Arcing produces sharp spikes >10kHz
      const burstFreq = 15000 + Math.random() * 5000;
      amplitude += 12 * Math.sin(2 * Math.PI * burstFreq * t) * Math.exp(-(t % 0.001) * 1000);
    }
    
    // Add 16-bit ADC quantization noise (approx ±0.05A)
    amplitude += (Math.random() - 0.5) * 0.1;
    
    data.push({
      time: tUs,
      amplitude,
      isTransient
    });
  }
  
  return data;
}

export function WaveformForensics({ poleId = "P-042", className }: WaveformForensicsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<WaveformPoint[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulate real-time 200kHz stream
  useEffect(() => {
    if (!isStreaming) return;
    
    const interval = setInterval(() => {
      setData(generateWaveformData(50)); // 50ms window
      setLastUpdate(new Date());
    }, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1;
    
    // Time grid (vertical) - 10ms divisions
    for (let x = 0; x <= width; x += width / 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Amplitude grid (horizontal) - 20A divisions
    for (let y = 0; y <= height; y += height / 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Center line (0A)
    ctx.strokeStyle = "#2a2a3e";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Scale factors
    const minTime = data[0].time;
    const maxTime = data[data.length - 1].time;
    const timeRange = maxTime - minTime;
    const ampRange = 100; // ±50A
    
    // Draw fundamental (blue trace) - filtered for visibility
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // Downsample for display (canvas can't show 10k points well)
    const displayPoints = 500;
    const step = Math.floor(data.length / displayPoints);
    
    let first = true;
    for (let i = 0; i < data.length; i += step) {
      const point = data[i];
      const x = ((point.time - minTime) / timeRange) * width;
      const y = height / 2 - (point.amplitude / ampRange) * (height / 2);
      
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Highlight transients (red)
    data.forEach((point, i) => {
      if (point.isTransient && i % step === 0) {
        const x = ((point.time - minTime) / timeRange) * width;
        const y = height / 2 - (point.amplitude / ampRange) * (height / 2);
        
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw measurement info
    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.fillText("16-bit ADC @ 200 kHz", 10, 20);
    ctx.fillText(`Pole: ${poleId}`, 10, 35);
    ctx.fillText(`Window: 50ms`, width - 80, 20);
    
  }, [data, poleId]);

  const handleDownload = () => {
    // Generate CSV of raw ADC samples
    const csv = data.map(p => `${p.time.toFixed(0)},${p.amplitude.toFixed(4)},${p.isTransient}`).join("\n");
    const blob = new Blob([`time_us,amplitude_A,is_transient\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waveform_${poleId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("bg-black border border-gray-800 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-blue-500" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              Live Waveform Forensics
            </h3>
            <p className="text-[10px] text-gray-500 font-mono">
              16-bit ADC @ 200 kHz • Hybrid Integrator Reconstruction
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isStreaming ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
            <span className="text-[10px] font-mono text-gray-400">
              {isStreaming ? "LIVE STREAM" : "PAUSED"}
            </span>
          </div>
          
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-[10px] font-mono text-gray-300 transition-colors"
          >
            {isStreaming ? "Pause" : "Resume"}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-[10px] font-mono text-white transition-colors"
          >
            <Download className="w-3 h-3" />
            Raw CSV
          </button>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={250}
          className="w-full h-[250px]"
        />
        
        {/* Legend overlay */}
        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur px-3 py-2 rounded border border-gray-800">
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500" />
              <span className="text-gray-400">60Hz Fundamental</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-400">Micro-Transient (&gt;10kHz)</span>
            </div>
          </div>
        </div>
        
        {/* Scale indicators */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-600 space-y-8">
          <span>+50A</span>
          <span>0A</span>
          <span>-50A</span>
        </div>
        
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-600">
          50ms window
        </div>
      </div>
      
      {/* Footer info */}
      <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
          <span>Sample Rate: 200 kHz</span>
          <span>Resolution: 16-bit (0.0015A LSB)</span>
          <span>Buffer: 10,000 samples</span>
        </div>
        <div className="text-[9px] font-mono text-gray-600">
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
