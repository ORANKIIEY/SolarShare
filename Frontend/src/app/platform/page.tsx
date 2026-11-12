"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
    Zap,
    Shield,
    Cloud,
    Activity,
    Cpu,
    Database,
    ArrowRight,
    CheckCircle,
    Layers,
    Lock,
    Eye,
    BarChart3,
} from "lucide-react";

const platformFeatures = [
    {
        icon: Eye,
        title: "Anomaly Detection Engine",
        desc: "CNN-XGBoost hybrid model trained on 10M+ data points from South African grids. Detects meter bypass, cable hooks, and tampering patterns in real-time.",
        stats: [
            { label: "Accuracy", value: "94.01%" },
            { label: "False Positive Rate", value: "<2%" },
        ],
    },
    {
        icon: Shield,
        title: "Surgical Isolation Protocol",
        desc: "AI-driven circuit breaker control isolates only compromised nodes. No more neighbourhood-wide blackouts.",
        stats: [
            { label: "Response Time", value: "<300ms" },
            { label: "Collateral Impact", value: "Zero" },
        ],
    },
    {
        icon: Database,
        title: "TaurusDB Telemetry Store",
        desc: "High-frequency sensor data stored in Huawei TaurusDB. Query 5 years of grid history in milliseconds.",
        stats: [
            { label: "Data Points/Day", value: "50M+" },
            { label: "Query Latency", value: "<10ms" },
        ],
    },
    {
        icon: Cpu,
        title: "ModelArts Inference",
        desc: "Serverless ML inference scales automatically during peak detection loads. Pay only for what you use.",
        stats: [
            { label: "Concurrent Analyses", value: "10,000+" },
            { label: "Cost Reduction", value: "60%" },
        ],
    },
];

const integrations = [
    { name: "Huawei Cloud", desc: "ModelArts, TaurusDB, OBS" },
    { name: "SCADA Systems", desc: "IEC 61850 Protocol Support" },
    { name: "Smart Meters", desc: "AMI/AMR Integration" },
    { name: "GIS Mapping", desc: "Esri & OpenStreetMap" },
];

function FeatureCard({ feature, index }: { feature: typeof platformFeatures[0]; index: number }) {
    const Icon = feature.icon;
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-50px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="relative group p-8 border border-border rounded-2xl bg-panel/40 backdrop-blur-xl hover:border-acid/30 transition-all"
        >
            <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-acid/50 to-transparent" />
            <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-acid/50 to-transparent" />

            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-acid/10 border border-acid/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-acid" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{feature.title}</h3>
                </div>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed mb-6">{feature.desc}</p>

            <div className="flex gap-6 pt-4 border-t border-border/50">
                {feature.stats.map((stat) => (
                    <div key={stat.label}>
                        <div className="text-lg font-bold text-acid font-mono">{stat.value}</div>
                        <div className="text-[10px] font-mono text-dim uppercase tracking-wider">{stat.label}</div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

export default function PlatformPage() {
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
                    <Link href="/platform" className="text-xs font-mono text-acid tracking-wider">Platform</Link>
                    <Link href="/sectors" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors tracking-wider">Sectors</Link>
                    <Link href="/compliance" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors tracking-wider">Compliance</Link>
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
            <section ref={heroRef} className="pt-32 pb-20 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={heroInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-3xl mx-auto mb-20"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-acid/30 bg-acid/5 mb-6">
                            <Layers className="w-3 h-3 text-acid" />
                            <span className="text-[10px] font-mono text-acid tracking-widest">PLATFORM ARCHITECTURE</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white mb-6">
                            Built for <span className="text-acid">Precision</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed">
                            Four integrated engines working in concert. Real-time detection, surgical response, 
                            cloud-native infrastructure, and enterprise-grade security.
                        </p>
                    </motion.div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
                        {platformFeatures.map((f, i) => (
                            <FeatureCard key={f.title} feature={f} index={i} />
                        ))}
                    </div>

                    {/* Integrations */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="border border-border rounded-2xl p-12 bg-panel/30"
                    >
                        <div className="text-center mb-10">
                            <span className="text-[10px] font-mono text-dim tracking-widest">ECOSYSTEM</span>
                            <h2 className="text-3xl font-bold text-white mt-2">Seamless Integrations</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {integrations.map((int) => (
                                <div key={int.name} className="text-center p-6 border border-border/50 rounded-xl bg-surface/30">
                                    <CheckCircle className="w-5 h-5 text-acid mx-auto mb-3" />
                                    <div className="font-bold text-white text-sm mb-1">{int.name}</div>
                                    <div className="text-[10px] font-mono text-dim">{int.desc}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 md:px-12">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-white mb-4">Ready to deploy?</h2>
                    <p className="text-zinc-500 mb-8">Get a personalized demo of the GridGuard AI platform.</p>
                    <Link href="/signup">
                        <motion.button
                            whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(204,255,0,0.35)" }}
                            whileTap={{ scale: 0.96 }}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-acid text-black font-bold tracking-wider rounded-xl text-sm"
                        >
                            <Zap className="w-4 h-4" />
                            Schedule Demo
                            <ArrowRight className="w-4 h-4" />
                        </motion.button>
                    </Link>
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