"use client";

import React, { useState, useEffect } from "react";
import {
    AlertTriangle,
    Search,
    CheckCircle,
    Clock,
    MapPin,
    Siren,
    X,
    FileText,
    ShieldAlert,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { apiGetIncidents, apiDispatchIncident } from "@/lib/api";

// --- Types ---
type IncidentStatus = "active" | "dispatched" | "resolved" | "investigating";

interface Incident {
    id: string;
    time: string;
    location: string;
    type: string;
    status: IncidentStatus;
    confidence: number;
}

export default function AlertsPage() {
    const { showToast } = useToast();

    // State - start empty, fetch from backend
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null); // For Modal

    // Fetch active incidents from backend on mount
    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const data = await apiGetIncidents("active");
                if (data) {
                    setIncidents(data.map(d => ({ ...d, status: d.status as IncidentStatus })));
                }
            } catch {
                // API unavailable — incidents will remain empty
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // --- Logic ---

    // 1. Handle Dispatch Action
    const handleDispatch = async (id: string) => {
        // Optimistic UI Update
        setIncidents((prev) =>
            prev.map((inc) =>
                inc.id === id ? { ...inc, status: "dispatched" } : inc
            )
        );

        // Close modal if open
        setSelectedIncident(null);

        // Try to call API (fire and forget with fallback)
        try {
            await apiDispatchIncident(id);
        } catch {
            // API unavailable — optimistic update still shows
        }

        // Feedback
        showToast(`Unit dispatched to ${id}`, "success");
    };


    // 2. Filter Logic
    const filteredIncidents = incidents.filter((inc) => {
        const matchesFilter = filter === "all" || inc.status === filter;
        const matchesSearch = inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inc.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // 3. Stats Calculation
    const activeCount = incidents.filter(i => i.status === "active").length;
    const investigatingCount = incidents.filter(i => i.status === "investigating" || i.status === "dispatched").length;

    return (
        <div className="p-6 md:p-12 space-y-8 relative min-h-screen">

            {/* --- Evidence Modal --- */}
            {selectedIncident && (
                <div className="fixed left-0 top-0 z-2000 h-dvh w-dvw bg-black/80 backdrop-blur-sm">
                    <button
                        type="button"
                        aria-label="Close evidence modal"
                        className="absolute inset-0 h-full w-full cursor-default"
                        onClick={() => setSelectedIncident(null)}
                    />

                    {/* Modal Content */}
                    <div className="absolute left-0 top-0 h-dvh w-dvw flex items-center justify-center p-4">
                        <div className="bg-surface border border-border w-full max-w-3xl rounded-lg shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                            {/* Modal Header */}
                            <div className="flex justify-between items-start p-6 border-b border-border bg-panel rounded-t-lg">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <ShieldAlert className="w-6 h-6 text-acid" />
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">EVIDENCE PACK: {selectedIncident.id}</h2>
                                    </div>
                                    <div className="flex gap-4 text-xs font-mono text-zinc-400">
                                        <span className="uppercase">{selectedIncident.type}</span>
                                        <span className="text-acid">AI Confidence: {selectedIncident.confidence}%</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedIncident(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body (Scrollable) */}
                            <div className="p-6 space-y-6 overflow-y-auto">

                                {/* Visual Evidence Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Fake Camera Feed */}
                                    <div className="space-y-2">
                                        <div className="text-[10px] uppercase text-zinc-500 font-mono">Pole Camera #404 Feed</div>
                                        <div className="bg-black border border-zinc-800 rounded h-48 flex items-center justify-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                                                <span className="text-zinc-700 text-xs font-mono">NO SIGNAL // IR MODE</span>
                                            </div>
                                            {/* Scanline effect */}
                                            <div className="absolute inset-0 bg-linear-to-b from-transparent via-acid/5 to-transparent h-full w-full animate-scan" />
                                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 text-acid text-[10px] font-mono border border-acid/20 rounded">
                                                MOTION DETECTED: 10:42 AM
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fake Harmonic Analysis */}
                                    <div className="space-y-2">
                                        <div className="text-[10px] uppercase text-zinc-500 font-mono">Harmonic Distortion Signature</div>
                                        <div className="bg-black border border-zinc-800 rounded h-48 p-4 flex flex-col justify-end">
                                            <div className="flex items-end gap-1 h-32 w-full justify-center">
                                                {[...Array(20)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-full bg-danger/80 hover:bg-danger transition-colors"
                                                        style={{ height: `${20 + Math.random() * 80}%` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-center text-[10px] text-zinc-500 font-mono border-t border-zinc-800 pt-2">
                                                Frequency Spectrum (THD: 18%)
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Analysis Log */}
                                <div className="bg-zinc-900/50 p-4 rounded border border-white/5 font-mono text-xs text-zinc-300 leading-relaxed">
                                    <span className="text-acid mr-2">[SYSTEM_LOG]</span>
                                    Anomaly detected at {selectedIncident.time}. Current leakage on Phase B exceeds 45A with no corresponding meter load.
                                    Pattern matches "Direct Hook" bypass signature (ID: #HK-99).
                                    <br /><br />
                                    <span className="text-warning mr-2">[RECOMMENDATION]</span>
                                    Immediate physical inspection required. Asset is at risk of thermal overload.
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-border bg-panel rounded-b-lg flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedIncident(null)}
                                    className="px-6 py-2 text-xs font-bold uppercase text-zinc-400 hover:text-white transition-colors"
                                >
                                    Close Evidence
                                </button>
                                {selectedIncident.status === 'active' && (
                                    <button
                                        onClick={() => handleDispatch(selectedIncident.id)}
                                        className="px-6 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-zinc-200 transition-colors shadow-lg flex items-center gap-2"
                                    >
                                        <Siren className="w-4 h-4" /> Dispatch Team
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Page Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-200 pb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-black flex items-center gap-3">
                        <AlertTriangle className="text-red-600 w-8 h-8" />
                        Active Incidents
                    </h1>
                    <p className="text-gray-700 font-mono text-sm">
                        Priority dispatch queue. {activeCount} High-Confidence events require immediate attention.
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-red-50 border border-red-200 px-6 py-3 rounded text-center min-w-25">
                        <div className="text-3xl font-bold text-red-600 font-mono">{activeCount}</div>
                        <div className="text-[10px] text-red-600 uppercase tracking-widest mt-1">Critical</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 px-6 py-3 rounded text-center min-w-25">
                        <div className="text-3xl font-bold text-yellow-600 font-mono">{investigatingCount}</div>
                        <div className="text-[10px] text-yellow-600 uppercase tracking-widest mt-1">Pending</div>
                    </div>
                </div>
            </div>

            {/* --- Toolbar --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {["all", "active", "dispatched", "resolved"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 text-xs font-mono uppercase rounded transition-colors whitespace-nowrap",
                                filter === f ? "bg-gray-900 text-white font-bold" : "text-black hover:bg-gray-100"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search Incident ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-64 bg-gray-50 border border-gray-200 rounded py-2 pl-9 pr-4 text-xs font-mono text-black focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/50 transition-all"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                </div>
            </div>

            {/* --- List View --- */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-20 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-gray-700 font-mono text-sm">Loading active incidents from backend...</p>
                    </div>
                ) : filteredIncidents.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <p className="text-gray-700 font-mono text-sm">No active incidents found.</p>
                        <p className="text-gray-500 font-mono text-xs mt-2">System is monitoring for new alerts...</p>
                    </div>
                ) : (
                    filteredIncidents.map((incident) => (
                        <div
                            key={incident.id}
                            className="group bg-white border border-gray-200 p-5 rounded-lg hover:border-gray-300 transition-all flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm"
                        >
                            {/* Status Indicator Strip */}
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                incident.status === 'active' ? "bg-red-600" :
                                    incident.status === 'dispatched' ? "bg-yellow-600" : "bg-green-600"
                            )} />

                            {/* Left: Info */}
                            <div className="flex items-center gap-6 w-full md:w-auto pl-2">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border",
                                    incident.status === "active" ? "bg-red-100 text-red-600 border-red-200 animate-pulse" :
                                        incident.status === "dispatched" ? "bg-yellow-100 text-yellow-600 border-yellow-200" : "bg-green-100 text-green-600 border-green-200"
                                )}>
                                    {incident.status === "active" ? <Siren className="w-6 h-6" /> :
                                        incident.status === "dispatched" ? <Clock className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                </div>

                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-mono text-black font-bold text-lg">{incident.id}</span>
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded font-mono uppercase border font-bold",
                                            incident.status === "active" ? "bg-red-100 border-red-300 text-red-700" :
                                                incident.status === "dispatched" ? "bg-yellow-100 border-yellow-300 text-yellow-700" : "bg-green-100 border-green-300 text-green-700"
                                        )}>
                                            {incident.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700 font-mono">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {incident.time}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {incident.location}</span>
                                        <span className="text-black font-bold">AI Conf: {incident.confidence}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => setSelectedIncident(incident)}
                                    className="flex-1 md:flex-none px-5 py-2.5 border border-gray-200 bg-gray-50 text-xs font-mono uppercase text-black hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 rounded"
                                >
                                    <FileText className="w-3 h-3" /> View Evidence
                                </button>

                                {incident.status === "active" && (
                                    <button
                                        onClick={() => handleDispatch(incident.id)}
                                        className="flex-1 md:flex-none px-5 py-2.5 bg-gray-900 text-white text-xs font-mono font-bold uppercase hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 rounded"
                                    >
                                        Dispatch Team <ChevronRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}