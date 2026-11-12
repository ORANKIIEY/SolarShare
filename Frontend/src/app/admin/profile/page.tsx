"use client";

import React, { useState, useEffect } from "react";
import { User, Shield, Key, Clock, LogOut, FileText, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { apiLogout, apiGetMe } from "@/lib/api";

export default function ProfilePage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [userName, setUserName] = useState("Thabo Mokoena");
    const [userRole, setUserRole] = useState("operator");
    const [userEmail, setUserEmail] = useState("");
    const [initials, setInitials] = useState("OP");

    // Load user: try API first, then fall back to localStorage
    useEffect(() => {
        (async () => {
            try {
                // Try live API
                const me = await apiGetMe();
                if (me) {
                    setUserName(me.name);
                    setUserRole(me.role);
                    setUserEmail(me.email);
                    const parts = me.name.split(" ");
                    setInitials(parts.length >= 2
                        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                        : me.name.slice(0, 2).toUpperCase());
                    return;
                }
            } catch { /* fall through to localStorage */ }
            // localStorage fallback
            try {
                const stored = localStorage.getItem("gridguard_user");
                if (stored) {
                    const user = JSON.parse(stored);
                    if (user.name) {
                        setUserName(user.name);
                        const parts = user.name.split(" ");
                        setInitials(parts.length >= 2
                            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                            : user.name.slice(0, 2).toUpperCase());
                    }
                    if (user.role) setUserRole(user.role);
                    if (user.email) setUserEmail(user.email);
                }
            } catch { /* keep defaults */ }
        })();
    }, []);

    const handlePasswordReset = () => {
        showToast("Reset link sent to secure email", "success");
    };

    const handleLogout = async () => {
        showToast("Signing out...", "info");
        try { await apiLogout(); } catch { /* ok */ }
        localStorage.removeItem("gridguard_token");
        localStorage.removeItem("gridguard_user");
        setTimeout(() => router.push('/login'), 1000);
    };

    return (
        <div className="p-6 md:p-12 w-full space-y-8">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 border-b border-border pb-8">
                <div className="w-24 h-24 rounded-full bg-linear-to-tr from-zinc-700 to-zinc-600 border-2 border-acid flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_20px_rgba(204,255,0,0.2)]">
                    OP
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-white font-sans uppercase">Operator 42</h1>
                        <BadgeCheck className="w-6 h-6 text-acid" />
                    </div>
                    <p className="text-zinc-500 font-mono text-sm mb-4">Senior Forensic Analyst • Sector 4 Unit</p>
                    <div className="flex flex-wrap gap-3">
                        <span className="px-3 py-1 bg-acid/10 border border-acid/20 text-acid text-xs font-mono rounded uppercase">Level 4 Clearance</span>
                        <span className="px-3 py-1 bg-surface border border-border text-zinc-400 text-xs font-mono rounded uppercase">ID: 882X-9</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Details */}
                <div className="bg-surface border border-border p-8 rounded-lg space-y-8">
                    <h3 className="font-mono text-xs text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Credentials</h3>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-panel rounded border border-white/5">
                                <User className="w-5 h-5 text-zinc-600" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-zinc-500 tracking-wider mb-1">Full Name</div>
                                <div className="text-white font-mono text-sm">{userName}</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-panel rounded border border-white/5">
                                <Shield className="w-5 h-5 text-zinc-600" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-zinc-500 tracking-wider mb-1">Department</div>
                                <div className="text-white font-mono text-sm">Revenue Protection Unit (RPU)</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-panel rounded border border-white/5">
                                <Key className="w-5 h-5 text-zinc-600" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] uppercase text-zinc-500 tracking-wider mb-1">Security Token</div>
                                <div className="text-white font-mono text-sm flex items-center justify-between">
                                    <span>•••••••••••••</span>
                                    <button onClick={handlePasswordReset} className="text-xs text-acid hover:underline uppercase">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Session Stats */}
                <div className="bg-surface border border-border p-8 rounded-lg space-y-8 flex flex-col">
                    <h3 className="font-mono text-xs text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Operational Activity</h3>

                    <div className="space-y-6 flex-1">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-panel rounded border border-white/5">
                                <Clock className="w-5 h-5 text-zinc-600" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-zinc-500 tracking-wider mb-1">Current Session Duration</div>
                                <div className="text-white font-mono text-sm">2h 45m</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-4 bg-panel rounded border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-zinc-500" />
                                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Logs Today</div>
                                </div>
                                <div className="text-2xl font-bold text-white font-mono">14</div>
                            </div>
                            <div className="p-4 bg-panel rounded border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-acid" />
                                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Isolations</div>
                                </div>
                                <div className="text-2xl font-bold text-white font-mono">03</div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-end">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-6 py-3 border border-danger/30 text-danger hover:bg-danger/10 rounded transition-colors text-sm font-bold uppercase"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}