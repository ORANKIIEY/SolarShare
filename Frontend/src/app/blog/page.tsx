"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
    Zap,
    Calendar,
    Clock,
    ArrowRight,
    Tag,
    User,
} from "lucide-react";

const posts = [
    {
        slug: "launch-announcement",
        title: "GridGuard AI Launches at Huawei Cloud Hackathon 2026",
        excerpt: "We're thrilled to announce the public unveiling of GridGuard AI, our AI-powered electricity theft detection platform built on Huawei Cloud infrastructure.",
        date: "Feb 28, 2026",
        readTime: "3 min read",
        category: "Announcement",
        author: "GridGuard Team",
        featured: true,
    },
    {
        slug: "cnn-xgboost-architecture",
        title: "How Our CNN-XGBoost Hybrid Achieves 94% Detection Accuracy",
        excerpt: "A deep dive into the machine learning architecture powering GridGuard AI's anomaly detection engine. Learn about feature engineering and model training.",
        date: "Feb 25, 2026",
        readTime: "8 min read",
        category: "Technical",
        author: "Engineering Team",
        featured: false,
    },
    {
        slug: "eskom-partnership",
        title: "Partnering with Municipalities to Fight Load Shedding",
        excerpt: "Energy theft costs South African municipalities billions annually. Here's how GridGuard AI is helping to recover those losses and stabilize the grid.",
        date: "Feb 20, 2026",
        readTime: "5 min read",
        category: "Case Study",
        author: "Business Team",
        featured: false,
    },
    {
        slug: "huawei-modelarts-integration",
        title: "Scaling ML Inference with Huawei ModelArts",
        excerpt: "How we leverage Huawei Cloud's ModelArts platform to process thousands of concurrent anomaly detection requests with sub-300ms latency.",
        date: "Feb 15, 2026",
        readTime: "6 min read",
        category: "Technical",
        author: "Engineering Team",
        featured: false,
    },
];

function PostCard({ post, index, featured = false }: { post: typeof posts[0]; index: number; featured?: boolean }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-50px" });

    const categoryColors: Record<string, string> = {
        Announcement: "text-acid border-acid/30 bg-acid/10",
        Technical: "text-blue-400 border-blue-400/30 bg-blue-400/10",
        "Case Study": "text-purple-400 border-purple-400/30 bg-purple-400/10",
    };

    return (
        <motion.article
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className={`group relative border border-border rounded-2xl bg-panel/40 overflow-hidden hover:border-acid/30 transition-all ${featured ? 'md:col-span-2' : ''}`}
        >
            <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border ${categoryColors[post.category] || categoryColors.Technical}`}>
                        {post.category}
                    </span>
                    {featured && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider text-yellow-400 border border-yellow-400/30 bg-yellow-400/10">
                            Featured
                        </span>
                    )}
                </div>

                <h3 className={`font-bold text-white mb-3 group-hover:text-acid transition-colors ${featured ? 'text-2xl' : 'text-lg'}`}>
                    {post.title}
                </h3>

                <p className={`text-zinc-400 leading-relaxed mb-6 ${featured ? 'text-base' : 'text-sm'}`}>
                    {post.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-4 text-[11px] font-mono text-dim">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {post.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {post.readTime}
                        </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-acid group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </motion.article>
    );
}

export default function BlogPage() {
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
                    <Link href="/compliance" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors tracking-wider">Compliance</Link>
                    <Link href="/blog" className="text-xs font-mono text-acid tracking-wider">Blog</Link>
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
                            <Tag className="w-3 h-3 text-acid" />
                            <span className="text-[10px] font-mono text-acid tracking-widest">INSIGHTS & UPDATES</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white mb-6">
                            Grid <span className="text-acid">Intel</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed">
                            Technical deep-dives, product updates, and insights from the frontlines 
                            of AI-powered grid protection.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Posts Grid */}
            <section className="pb-20 px-6 md:px-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {posts.map((post, i) => (
                        <PostCard key={post.slug} post={post} index={i} featured={post.featured} />
                    ))}
                </div>
            </section>

            {/* Newsletter CTA */}
            <section className="py-16 px-6 md:px-12 border-t border-border/50">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Stay Informed</h2>
                    <p className="text-zinc-500 mb-6">Get the latest GridGuard updates delivered to your inbox.</p>
                    <div className="flex gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="operator@municipality.gov.za"
                            className="flex-1 px-4 py-3 bg-panel border border-border rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-acid"
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-6 py-3 bg-acid text-black font-bold text-sm rounded-lg"
                        >
                            Subscribe
                        </motion.button>
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