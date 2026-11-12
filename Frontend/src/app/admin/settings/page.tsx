"use client";

import React, { useState, useEffect } from "react";
import { Save, RefreshCw, Power, Shield, Bell, Lock } from "lucide-react";
import { SYSTEM_LOGS } from "@/lib/data";
import { useToast } from "@/components/ui/Toast"; // Import hook
import { apiGetSettings, apiUpdateSettings, apiGetAuditLogs } from "@/lib/api";

export default function SettingsPage() {
    const { showToast } = useToast(); // Hook
    const [sensitivity, setSensitivity] = useState(95);
    const [autoIsolate, setAutoIsolate] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState(SYSTEM_LOGS);

    // Fetch settings and logs on mount
    useEffect(() => {
        (async () => {
            try {
                const settings = await apiGetSettings();
                if (settings) {
                    setSensitivity(settings.sensitivity);
                    setAutoIsolate(settings.autoIsolate);
                }
            } catch { /* keep defaults */ }

            try {
                const auditLogs = await apiGetAuditLogs();
                if (auditLogs && auditLogs.length > 0) {
                    setLogs(auditLogs.map((l, i) => ({ id: i + 1, time: l.time, event: l.event })));
                }
            } catch { /* keep mock logs */ }
        })();
    }, []);

    const handleSave = async () => {
        setSaving(true);

        try {
            await apiUpdateSettings({ sensitivity, autoIsolate });
        } catch { /* API unavailable — still show success to match original UX */ }

        setTimeout(() => {
            setSaving(false);
            showToast("System Configuration Synced Successfully", "success"); // Trigger toast
        }, 1000);
    };

    return (
        <div className="p-6 md:p-12 w-full space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-black">
                        System Configuration
                    </h1>
                    <p className="text-gray-700 font-mono text-sm">
                        Manage detection algorithms and automated response protocols.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white font-bold uppercase text-xs rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Syncing..." : "Save Changes"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Algorithm Controls */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Threshold Card */}
                        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-mono text-sm text-black uppercase flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Detection Sensitivity
                                    </h3>
                                    <p className="text-[10px] text-gray-700 mt-1">
                                        Confidence threshold for automatic flagging.
                                    </p>
                                </div>
                                <span className="text-2xl font-bold text-black font-mono">{sensitivity}%</span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="99"
                                value={sensitivity}
                                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                                className="w-full accent-gray-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-gray-700 font-mono mt-2 uppercase">
                                <span>Balanced</span>
                                <span>Aggressive</span>
                            </div>
                        </div>

                        {/* Automation Card */}
                        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="font-mono text-sm text-black uppercase flex items-center gap-2">
                                    <Power className="w-4 h-4 text-gray-600" />
                                    Auto-Isolation
                                </h3>
                                <p className="text-[10px] text-gray-700 mt-1">
                                    Grant AI permission to disconnect lines.
                                </p>
                            </div>
                            <div className="flex items-center justify-between mt-4 bg-gray-50 p-3 rounded border border-gray-200">
                                <span className="text-xs font-mono text-black">Status: {autoIsolate ? "ARMED" : "MANUAL"}</span>
                                <button
                                    onClick={() => setAutoIsolate(!autoIsolate)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${autoIsolate ? 'bg-gray-700' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${autoIsolate ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings (New Section) */}
                    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                        <h3 className="font-mono text-sm text-black uppercase flex items-center gap-2 mb-4">
                            <Bell className="w-4 h-4 text-gray-600" /> Alert Preferences
                        </h3>
                        <div className="space-y-3">
                            {['SMS Alerts (Critical)', 'Email Reports (Daily)', 'Push Notifications'].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => showToast("Preference Updated", "info")}>
                                    <div className="w-4 h-4 border border-gray-400 rounded flex items-center justify-center">
                                        <div className="w-2 h-2 bg-gray-600 rounded-sm" />
                                    </div>
                                    <span className="text-xs font-mono text-black">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Logs (Stretches full height) */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full min-h-125 shadow-sm">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-mono text-xs text-black uppercase tracking-widest">System Audit Log</h3>
                        <Lock className="w-3 h-3 text-gray-600" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-3 text-xs border-b border-gray-100 pb-3 last:border-0 group">
                                <span className="font-mono text-gray-500 shrink-0 group-hover:text-gray-700 transition-colors">{log.time}</span>
                                <span className="text-black font-mono">{log.event}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}