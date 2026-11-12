"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
// reCAPTCHA removed — replaced by Huawei WAF bot protection (Project_Work_Breakdown: Auth0 → IAM with MFA integration)
import { apiSignup } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import {
    User,
    Lock,
    Mail,
    Eye,
    EyeOff,
    ChevronRight,
    AlertTriangle,
    Zap,
    Building2,
    CheckCircle2,
} from "lucide-react";
import Link from "next/link";

// ── Floating Label Input (re-used pattern) ───────────────────────────────────
interface FloatingInputProps {
    id: string;
    type: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    icon?: React.ReactNode;
    trailing?: React.ReactNode;
    autoComplete?: string;
}
function FloatingInput({ id, type, label, value, onChange, error, icon, trailing, autoComplete }: FloatingInputProps) {
    const [focused, setFocused] = useState(false);
    const floated = focused || value.length > 0;
    return (
        <div className="relative">
            <motion.div
                animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35, type: "spring" }}
                className={`relative border rounded-lg transition-all duration-200 overflow-hidden
          ${error ? "border-danger shadow-[0_0_0_2px_rgba(255,69,58,0.2)]"
                        : focused ? "border-acid shadow-[0_0_0_2px_rgba(204,255,0,0.15)]"
                            : "border-border"
                    }`}
            >
                <label htmlFor={id} className={`absolute left-10 transition-all duration-200 pointer-events-none font-mono select-none
          ${floated ? "top-1.5 text-[9px] tracking-widest uppercase text-acid" : "top-1/2 -translate-y-1/2 text-sm text-dim"}`}>
                    {label}
                </label>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dim">{icon}</div>
                <input
                    id={id} type={type} value={value} autoComplete={autoComplete}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    className="w-full bg-panel text-white text-sm pt-5 pb-2 px-3 pl-10 pr-10 focus:outline-none font-mono placeholder:text-transparent"
                />
                {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
            </motion.div>
            <AnimatePresence>
                {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="mt-1.5 text-[10px] font-mono text-danger flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Password Strength Meter ──────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ characters", pass: password.length >= 8 },
        { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
        { label: "Number", pass: /\d/.test(password) },
        { label: "Special character", pass: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = checks.filter((c) => c.pass).length;
    const colors = ["bg-dim", "bg-danger", "bg-yellow-500", "bg-acid/60", "bg-acid"];
    const labels = ["", "Weak", "Fair", "Good", "Strong"];

    if (!password) return null;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-dim/30"}`} />
                ))}
            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {checks.map((c) => (
                        <span key={c.label} className={`text-[9px] font-mono flex items-center gap-1 transition-colors ${c.pass ? "text-acid" : "text-dim"}`}>
                            <CheckCircle2 className="w-2.5 h-2.5" />{c.label}
                        </span>
                    ))}
                </div>
                {score > 0 && <span className={`text-[10px] font-mono ${score >= 4 ? "text-acid" : score >= 3 ? "text-yellow-500" : "text-danger"}`}>{labels[score]}</span>}
            </div>
        </motion.div>
    );
}

// ── Social Button ────────────────────────────────────────────────────────────
function SocialButton({ label, logo }: { label: string; logo: React.ReactNode }) {
    return (
        <motion.button type="button" whileHover={{ scale: 1.02, borderColor: "rgba(204,255,0,0.3)" }} whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2.5 py-2.5 border border-border rounded-lg text-xs font-mono text-zinc-400 hover:text-white transition-colors bg-panel/60">
            {logo}{label}
        </motion.button>
    );
}

const HuaweiLogo = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-3.67L7.77 14.9 7 13.6l3.23-2.1L7 9.4l.77-1.3 3.23 2.07V6.5h1.5v3.67L15.23 8.1 16 9.4l-3.23 2.1L16 13.6l-.77 1.3-3.23-2.07V16.5H11z" />
    </svg>
);

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SignupPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [fullName, setFullName] = useState("");
    const [org, setOrg] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
    const [submitted, setSubmitted] = useState(false);
    const [captchaToken, ] = useState<string | null>("waf-protected"); // Huawei WAF handles bot protection server-side

    const validate = () => {
        const e: { [key: string]: string | undefined } = {};
        if (!fullName.trim()) e.fullName = "Full name is required";
        if (!org.trim()) e.org = "Organisation is required";
        if (!email) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
        if (!password) e.password = "Password is required";
        else if (password.length < 8) e.password = "Must be at least 8 characters";
        if (!agreed) e.agreed = "You must accept the terms";
        return e;
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setIsLoading(true);

        try {
            const result = await apiSignup(email, password, fullName, captchaToken!);
            if (result) {
                localStorage.setItem("gridguard_token", result.token);
                localStorage.setItem("gridguard_user", JSON.stringify(result.user));
                setSubmitted(true);
            } else {
                showToast("Registration failed. Email might already be in use.", "error");
                setIsLoading(false);
            }
        } catch {
            showToast("Connection error. Is the backend running?", "error");
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 text-center py-8"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-16 h-16 rounded-full bg-acid/10 border border-acid/40 flex items-center justify-center"
                >
                    <CheckCircle2 className="w-8 h-8 text-acid" />
                </motion.div>
                <h2 className="text-2xl font-extrabold tracking-tighter text-white">Clearance Requested</h2>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed max-w-xs">
                    Your operator registration has been submitted. You&apos;ll receive access credentials via
                    secure channel within 24 hours.
                </p>
                <Link href="/login">
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="mt-2 px-6 py-3 bg-acid text-black font-bold text-sm tracking-wider rounded-xl"
                    >
                        Back to Login
                    </motion.button>
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-acid/30 bg-acid/5 mb-3">
                    <Zap className="w-3 h-3 text-acid" />
                    <span className="text-[10px] font-mono text-acid tracking-widest">REQUEST OPERATOR CLEARANCE</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tighter text-white">
                    Create Account
                </h1>
                <p className="text-sm text-zinc-500 font-mono">
                    Register your organisation with GridGuard AI.
                </p>
            </div>

            {/* Social Auth — Huawei ID only per Project_Work_Breakdown (Auth0 → IAM with MFA integration) */}
            <div className="flex gap-3">
                <SocialButton label="Huawei ID" logo={<HuaweiLogo />} />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-mono text-dim tracking-widest">OR REGISTER WITH EMAIL</span>
                <div className="flex-1 h-px bg-border" />
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} noValidate className="space-y-4">
                <div
                    className="relative rounded-xl border border-border bg-panel/60 backdrop-blur-xl p-6 space-y-4"
                    style={{ boxShadow: "0 20px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)" }}
                >
                    <div className="absolute top-0 left-0 w-8 h-px bg-acid/50" />
                    <div className="absolute top-0 left-0 h-8 w-px bg-acid/50" />
                    <div className="absolute bottom-0 right-0 w-8 h-px bg-acid/30" />
                    <div className="absolute bottom-0 right-0 h-8 w-px bg-acid/30" />

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <FloatingInput id="fullName" type="text" label="Full Name" value={fullName}
                                onChange={setFullName} error={errors.fullName} autoComplete="name"
                                icon={<User className="w-4 h-4" />} />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <FloatingInput id="org" type="text" label="Organisation" value={org}
                                onChange={setOrg} error={errors.org} autoComplete="organization"
                                icon={<Building2 className="w-4 h-4" />} />
                        </div>
                    </div>

                    <FloatingInput id="email" type="email" label="Official Email" value={email}
                        onChange={setEmail} error={errors.email} autoComplete="email"
                        icon={<Mail className="w-4 h-4" />} />

                    <div className="space-y-2">
                        <FloatingInput id="password" type={showPass ? "text" : "password"} label="Set Access Key"
                            value={password} onChange={setPassword} error={errors.password} autoComplete="new-password"
                            icon={<Lock className="w-4 h-4" />}
                            trailing={
                                <button type="button" onClick={() => setShowPass(!showPass)} className="text-dim hover:text-white transition-colors">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />
                        <PasswordStrength password={password} />
                    </div>

                    {/* Terms */}
                    <div className="space-y-1.5">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div
                                className="relative mt-0.5 w-4 h-4 border border-border rounded flex-shrink-0 cursor-pointer transition-colors"
                                style={{ borderColor: agreed ? "#ccff00" : errors.agreed ? "#ff453a" : undefined, backgroundColor: agreed ? "#ccff0020" : undefined }}
                                onClick={() => setAgreed(!agreed)}
                            >
                                {agreed && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-sm bg-acid" />
                                    </motion.div>
                                )}
                            </div>
                            <span className="text-[11px] font-mono text-dim group-hover:text-zinc-400 transition-colors select-none leading-relaxed">
                                I agree to the{" "}
                                <Link href="#" className="text-acid hover:text-white transition-colors">Terms of Service</Link>{" "}
                                and{" "}
                                <Link href="#" className="text-acid hover:text-white transition-colors">Security Policy</Link>
                            </span>
                        </label>
                        <AnimatePresence>
                            {errors.agreed && (
                                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                    className="text-[10px] font-mono text-danger flex items-center gap-1 ml-7">
                                    <AlertTriangle className="w-3 h-3" />{errors.agreed}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Bot protection by Huawei WAF (Project_Work_Breakdown: WAF rate limiting) */}
                <div className="flex justify-center py-2">
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-lg flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Protected by Huawei WAF
                    </div>
                </div>

                {/* Submit */}
                <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={!isLoading ? { scale: 1.02, boxShadow: "0 0 30px rgba(204,255,0,0.3)" } : {}}
                    whileTap={!isLoading ? { scale: 0.98 } : {}}
                    className="w-full bg-acid text-black font-bold uppercase tracking-widest py-3.5 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <motion.span className="font-mono" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                            SUBMITTING REQUEST...
                        </motion.span>
                    ) : (
                        <>
                            <Zap className="w-4 h-4" />
                            Request Clearance
                            <ChevronRight className="w-4 h-4" />
                        </>
                    )}
                </motion.button>
            </form>

            <p className="text-center text-xs font-mono text-dim">
                Already have clearance?{" "}
                <Link href="/login" className="text-acid hover:text-white transition-colors">
                    Sign in →
                </Link>
            </p>
        </motion.div>
    );
}
