"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
    Zap,
    MapPin,
    Activity,
    Users,
    TrendingUp,
    ArrowRight,
    Building2,
    Factory,
    Home,
    Landmark,
} from "lucide-react";

const sectors = [
    {
        id: "sector-1",
        name: "Sector 1",
        zone: "Industrial District",
        icon: Factory,
        nodes: 420,
        lossRate: "2.1%",
        status: "optimal",
        savings: "R2.4M",
        description: "Heavy industrial consumers including steel mills, chemical plants, and manufacturing facilities.",
    },
    {
        id: "sector-2",
        name: "Sector 2",
        zone: "Commercial Hub",
        icon: Building2,
        nodes: 380,
        lossRate: "3.8%",
        status: "monitoring",
        savings: "R1.8M",
        description: "Shopping centers, office complexes, and mixed-use commercial developments.",
    },
    {
        id: "sector-3",
        name: "Sector 3",
        zone: "Residential North",
        icon: Home,
        nodes: 520,
        lossRate: "8.2%",
        status: "critical",
        savings: "R890K",
        description: "High-density residential areas with documented theft hotspots. Priority monitoring zone.",
    },
    {
        id: "sector-4",
        name: "Sector 4",
        zone: "Government Precinct",
        icon: Landmark,
        nodes: 180,
        lossRate: "0.4%",
        status: "optimal",
        savings: "R420K",
        description: "Municipal buildings, hospitals, schools, and critical infrastructure.",
    },
];

const stats = [
    { label: "Total Nodes Monitored", value: "1,500+", icon: Activity },
    { label: "Annual Savings", value: "R5.5M", icon: TrendingUp },
    { label: "Active Operators", value: "42", icon: Users },
    { label: "Uptime", value: "99.97%", icon: Zap },
];

function SectorCard({ sector, index }: { sector: typeof sectors[0]; index: number }) {
    const Icon = sector.icon;
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-50px" });

    const statusColors = {
        optimal: "text-acid border-acid/30 bg-acid/10",
        monitoring: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
        critical: "text-danger border-danger/30 bg-danger/10",
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="relative group border border-border rounded-2xl bg-panel/40 backdrop-blur-xl overflow-hidden hover:border-acid/30 transition-all"
        >
            <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-surface border border-border flex items-center justify-center">
                            <Icon className="w-7 h-7 text-acid" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{sector.name}</h3>
                            <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
                                <MapPin className="w-3 h-3" />
                                {sector.zone}
                            </div>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border ${statusColors[sector.status as keyof typeof statusColors]}`}>
                        {sector.status}
                    </span>
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed mb-6">{sector.description}</p>

                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
                    <div>
                        <div className="text-lg font-bold text-white font-mono">{sector.nodes}</div>
                        <div className="text-[10px] font-mono text-dim uppercase">Nodes</div>
                    </div>
                    <div>
                        <div className={`text-lg font-bold font-mono ${parseFloat(sector.lossRate) > 5 ? 'text-danger' : 'text-acid'}`}>
                            {sector.lossRate}
                        </div>
                        <div className="text-[10px] font-mono text-dim uppercase">Loss Rate</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-acid font-mono">{sector.savings}</div>
                        <div className="text-[10px] font-mono text-dim uppercase">Saved/Year</div>
                    </div>
                </div>
            </div>

            <div className="px-8 py-4 bg-surface/50 border-t border-border/50">
                <Link href="/login" className="flex items-center justify-between text-sm text-zinc-400 hover:text-acid transition-colors group/link">
                    <span className="font-mono">View Sector Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
            </div>
        </motion.div>
    );
}

export default function SectorsPage() {
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
                    <Link href="/sectors" className="text-xs font-mono text-acid tracking-wider">Sectors</Link>
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
            <section ref={heroRef} className="pt-32 pb-16 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={heroInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-3xl mx-auto mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-acid/30 bg-acid/5 mb-6">
                            <MapPin className="w-3 h-3 text-acid" />
                            <span className="text-[10px] font-mono text-acid tracking-widest">DEPLOYMENT ZONES</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white mb-6">
                            Active <span className="text-acid">Sectors</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed">
                            GridGuard AI monitors multiple sectors across the municipality. 
                            Each zone is optimized for its unique load profile and theft patterns.
                        </p>
                    </motion.div>

                    {/* Stats Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={heroInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
                    >
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center p-6 border border-border rounded-xl bg-panel/30">
                                <stat.icon className="w-5 h-5 text-acid mx-auto mb-3" />
                                <div className="text-2xl font-bold text-white font-mono mb-1">{stat.value}</div>
                                <div className="text-[10px] font-mono text-dim uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Sector Cards */}
            <section className="pb-20 px-6 md:px-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sectors.map((sector, i) => (
                        <SectorCard key={sector.id} sector={sector} index={i} />
                    ))}
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