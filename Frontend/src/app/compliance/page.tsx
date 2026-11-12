"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
    Zap,
    Shield,
    FileText,
    Scale,
    CheckCircle,
    Lock,
    Eye,
    AlertTriangle,
    Building,
    Globe,
} from "lucide-react";

const regulations = [
    {
        icon: Scale,
        title: "Cybercrimes Act 19 of 2020",
        authority: "Republic of South Africa",
        desc: "GridGuard AI complies fully with data protection and cybercrime provisions. All unauthorized access attempts are logged and reportable.",
        status: "Compliant",
    },
    {
        icon: Building,
        title: "NERSA Regulations",
        authority: "National Energy Regulator",
        desc: "Licensed for electricity metering data processing. Adheres to grid stability protocols and reporting requirements.",
        status: "Certified",
    },
    {
        icon: Lock,
        title: "POPIA Compliance",
        authority: "Information Regulator",
        desc: "Personal data processed in accordance with Protection of Personal Information Act. Data minimization and purpose limitation enforced.",
        status: "Compliant",
    },
    {
        icon: Globe,
        title: "ISO 27001:2022",
        authority: "International Standard",
        desc: "Information Security Management System certified. Annual audits conducted by accredited third parties.",
        status: "Certified",
    },
];

const securityFeatures = [
    { icon: Lock, title: "End-to-End Encryption", desc: "AES-256 encryption for data at rest and TLS 1.3 in transit" },
    { icon: Eye, title: "Audit Logging", desc: "Immutable audit trail for all system access and actions" },
    { icon: Shield, title: "Role-Based Access", desc: "Granular permissions with principle of least privilege" },
    { icon: AlertTriangle, title: "Intrusion Detection", desc: "Real-time monitoring and automated threat response" },
];

export default function CompliancePage() {
    const heroRef = useRef(null);
    const heroInView = useInView(heroRef, { once: true });

    return (
        <div className="min-h-screen bg-void">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/50 backdrop-blur-xl bg-void/70">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-acid flex items-center justify-center">
                        <Zap className="w-4 h-4 text-void" />
                    </div>
                    <span className="font-bold text-white tracking-tight text-sm">GridGuard <span className="text-acid">AI</span></span>
                </Link>
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/platform" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors tracking-wider">Platform</Link>
                    <Link href="/sectors" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors tracking-wider">Sectors</Link>
                    <Link href="/compliance" className="text-xs font-mono text-acid tracking-wider">Compliance</Link>
                    <Link href="/blog" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors tracking-wider">Blog</Link>
                </div>
                <Link href="/login">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 text-xs font-bold font-mono uppercase tracking-widest text-black bg-acid hover:bg-white transition-colors rounded-md"
                    >
                        Mission Control →
                    </motion.button>
                </Link>
            </nav>

            {/* Hero */}
            <section ref={heroRef} className="pt-32 pb-16 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={heroInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-3xl mx-auto mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-acid/30 bg-acid/5 mb-6">
                            <Shield className="w-3 h-3 text-acid" />
                            <span className="text-[10px] font-mono text-acid tracking-widest">SECURITY & COMPLIANCE</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white mb-6">
                            Built on <span className="text-acid">Trust</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed">
                            GridGuard AI meets the highest standards of regulatory compliance and cybersecurity. 
                            Protecting infrastructure and personal data is our foundation.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Regulations Grid */}
            <section className="pb-16 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Regulatory Framework</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {regulations.map((reg, i) => (
                            <motion.div
                                key={reg.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 border border-border rounded-2xl bg-panel/40"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-acid/10 border border-acid/20 flex items-center justify-center">
                                        <reg.icon className="w-6 h-6 text-acid" />
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider text-acid border border-acid/30 bg-acid/10">
                                        {reg.status}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{reg.title}</h3>
                                <p className="text-xs font-mono text-dim mb-4">{reg.authority}</p>
                                <p className="text-zinc-400 text-sm leading-relaxed">{reg.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Features */}
            <section className="py-16 px-6 md:px-12 border-t border-border/50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Security Architecture</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {securityFeatures.map((feat, i) => (
                            <motion.div
                                key={feat.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 border border-border rounded-xl bg-surface/30 text-center"
                            >
                                <feat.icon className="w-8 h-8 text-acid mx-auto mb-4" />
                                <h3 className="font-bold text-white text-sm mb-2">{feat.title}</h3>
                                <p className="text-[11px] text-zinc-500 leading-relaxed">{feat.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Warning Banner */}
            <section className="py-12 px-6 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-start gap-4 p-6 rounded-xl bg-danger/5 border border-danger/20">
                        <AlertTriangle className="w-6 h-6 text-danger shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-white mb-2">Unauthorised Access Warning</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Unauthorised access to GridGuard AI systems is a criminal offence under the Cybercrimes Act 19 of 2020. 
                                All sessions are logged, geolocated, and subject to forensic analysis. Violations will be reported 
                                to the South African Police Service Cybercrime Unit.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border px-6 md:px-12 py-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-acid flex items-center justify-center">
                            <Zap className="w-3 h-3 text-void" />
                        </div>
                        <span className="text-xs font-mono text-dim">GridGuard AI © 2026</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-700 tracking-wider">
                        BUILT FOR HUAWEI CLOUD HACKATHON 2026
                    </span>
                </div>
            </footer>
        </div>
    );
}