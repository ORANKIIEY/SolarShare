"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Menu,
  X,
  Shield,
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  Play,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ── Text Hover Effect (Flow Website Style) ─────────────────────────────────
function TextHover({ title1, title2, className = "" }: { title1: string; title2?: string; className?: string }) {
  const text = title2 || title1;
  return (
    <div className={`group overflow-hidden cursor-pointer ${className}`}>
      <div className="relative">
        <div className="translate-y-0 group-hover:-translate-y-full transition-transform duration-500 ease-out">
          <span className="block">{title1}</span>
        </div>
        <div className="absolute top-0 left-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <span className="block text-primary">{text}</span>
        </div>
      </div>
    </div>
  );
}

// ── Marquee Text Component ──────────────────────────────────────────────────
function MarqueeText({ text, className = "", reverse = false, speed = 20 }: { text: string; className?: string; reverse?: boolean; speed?: number }) {
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div
        className="inline-flex gap-16"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {[...Array(4)].map((_, i) => (
          <span key={i} className="text-display text-display-xl opacity-10">
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Rotating Badge Component ─────────────────────────────────────────────────
function RotatingBadge({ text, subtext }: { text: string; subtext?: string }) {
  return (
    <div className="relative">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        className="w-32 h-32 md:w-40 md:h-40"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <path
              id="circlePath"
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
            />
          </defs>
          <text className="text-[11px] font-mono fill-primary tracking-widest uppercase">
            <textPath href="#circlePath">
              {text} • {text} • {text} •
            </textPath>
          </text>
        </svg>
      </motion.div>
      {subtext && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-display text-text">{subtext}</span>
        </div>
      )}
    </div>
  );
}

// ── Feature Card with Hover Effect ─────────────────────────────────────────
function FeatureCard({ title, description, number, index }: { title: string; description: string; number: string; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group cursor-pointer"
    >
      <div className="border-t-2 border-border pt-8 pb-12">
        <div className="flex items-start justify-between mb-6">
          <span className="text-[11px] font-mono text-text-muted tracking-widest">{number}</span>
          <motion.div
            animate={{ rotate: isHovered ? 45 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowRight className="w-5 h-5 text-primary" />
          </motion.div>
        </div>
        <h3 className="text-2xl md:text-3xl font-display text-text mb-4 group-hover:text-primary transition-colors duration-500">
          {title}
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-md">
          {description}
        </p>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-primary"
        initial={{ width: "0%" }}
        animate={{ width: isHovered ? "100%" : "0%" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}

// ── Project Card with Hover Modal (Awwwards Style) ──────────────────────────
function ProjectCard({ title, category, image, index, setModal }: { title: string; category: string; image: string; index: number; setModal: (state: { active: boolean; index: number }) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => {
        setIsHovered(true);
        setModal({ active: true, index });
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setModal({ active: false, index });
      }}
      className="relative py-8 border-b border-border cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-sm font-mono text-text-muted">0{index + 1}</span>
          <h3 className={`text-3xl md:text-5xl font-display transition-all duration-500 ${isHovered ? 'text-primary -translate-x-4' : 'text-text'}`}>
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary uppercase tracking-wider">{category}</span>
          <motion.div
            animate={{ x: isHovered ? 10 : 0, opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowRight className="w-6 h-6 text-primary" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Navigation ──────────────────────────────────────────────────────────────
function Navigation({ onBookDemo }: { onBookDemo: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Products", href: "#products" },
    { label: "Enterprise", href: "#enterprise" },
    { label: "Government", href: "#government" },
    { label: "Resources", href: "#resources" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-white/95 backdrop-blur-xl border-b border-border" : "bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                <img src="/Logo.webp" alt="GridGuard" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-display text-xl tracking-tight text-black">
                GridGuard
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-text-secondary hover:text-black transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={onBookDemo}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Book a Demo
            </button>
            <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-black transition-colors">
              → Log In
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-white md:hidden"
          >
            <div className="flex flex-col items-center justify-center h-full gap-8">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-3xl font-display text-black hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <button 
                  onClick={() => { setIsOpen(false); onBookDemo(); }}
                  className="mt-4 px-8 py-4 bg-black text-white text-lg font-semibold rounded-xl"
                >
                  Book a Demo
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Interactive Grid Background Component ────────────────────────────────────
function InteractiveGridBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;

    // Track mouse position
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Animation loop for smooth grid movement
    const animate = () => {
      // Smooth interpolation
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Calculate offset based on mouse position (parallax effect)
      const offsetX = (targetX - container.offsetWidth / 2) * 0.02;
      const offsetY = (targetY - container.offsetHeight / 2) * 0.02;

      gsap.to(grid, {
        x: offsetX,
        y: offsetY,
        duration: 0.5,
        ease: 'power2.out'
      });

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-auto"
    >
      <div 
        ref={gridRef}
        className="absolute -inset-20 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(156, 163, 175, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(156, 163, 175, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
    </div>
  );
}

// ── Hero Section ────────────────────────────────────────────────────────────
function HeroSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parallax effect for hero text
    if (heroTextRef.current) {
      gsap.to(heroTextRef.current, {
        yPercent: -50,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top top",
          end: "bottom top",
          scrub: 1
        }
      });
    }

    // Parallax effect for hero image
    if (heroImageRef.current) {
      gsap.to(heroImageRef.current, {
        yPercent: 30,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top top",
          end: "bottom top",
          scrub: 1
        }
      });
    }

    // Stagger animation for stats
    if (statsRef.current) {
      const statCards = statsRef.current.querySelectorAll('.stat-card');
      gsap.fromTo(statCards, 
        {
          opacity: 0,
          y: 50,
          scale: 0.8
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: statsRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }
  }, []);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center bg-white overflow-hidden">
      {/* Interactive Grid Background */}
      <InteractiveGridBackground />
      
      <div className="max-w-6xl mx-auto px-6 md:px-16 relative z-10">
        <div className="text-center">
          <div ref={heroTextRef} className="flex flex-col gap-6 lg:gap-8 max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl lg:text-8xl font-display text-black leading-tight font-bold"
            >
              <span className="text-primary">GridGuard AI</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl md:text-2xl lg:text-3xl text-text-secondary leading-relaxed max-w-4xl mx-auto"
            >
              Advanced infrastructure monitoring that protects energy grids by analyzing patterns and detecting potential issues before they become problems.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4 md:gap-6"
            >
              <Link href="#products">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-white to-gray-50 text-black font-semibold rounded-xl hover:from-gray-50 hover:to-gray-100 transition-all shadow-lg border border-gray-200 text-base md:text-lg"
                >
                  Learn more
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── System Capabilities Section ────────────────────────────────────────────────────
function SystemCapabilitiesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const capabilitiesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Stagger animation for capability cards
    if (capabilitiesRef.current) {
      const cards = capabilitiesRef.current.querySelectorAll('.capability-card');
      gsap.fromTo(cards, 
        {
          opacity: 0,
          y: 60,
          scale: 0.9
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: capabilitiesRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }
  }, []);

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 lg:mb-20"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display text-black leading-tight mb-6">
            Now your systems can use it too.
          </h2>
          <p className="text-base md:text-lg text-text-secondary max-w-3xl mx-auto leading-relaxed">
            GridGuard explains grid cards and provides real-time monitoring with proven accuracy and response times.
          </p>
        </motion.div>

        <div ref={capabilitiesRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="capability-card p-6 md:p-8 border border-border rounded-2xl text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 mx-auto mb-3 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/Logo.webp" alt="GridGuard" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
            </div>
            <div className="text-sm text-text-secondary">Grid Protection</div>
          </div>
          <div className="capability-card p-6 md:p-8 border border-border rounded-2xl text-center">
            <div className="text-3xl md:text-4xl lg:text-5xl font-display text-black mb-3 font-bold">94%</div>
            <div className="text-sm text-text-secondary">Detection Accuracy</div>
          </div>
          <div className="capability-card p-6 md:p-8 border border-border rounded-2xl text-center">
            <div className="text-3xl md:text-4xl lg:text-5xl font-display text-black mb-3 font-bold">300ms</div>
            <div className="text-sm text-text-secondary">Response Time</div>
          </div>
          <div className="capability-card p-6 md:p-8 border border-border rounded-2xl text-center">
            <div className="text-3xl md:text-4xl lg:text-5xl font-display text-black mb-3 font-bold">Zero</div>
            <div className="text-sm text-text-secondary">Collateral Impact</div>
          </div>
          <div className="capability-card p-6 md:p-8 border border-border rounded-2xl text-center">
            <div className="text-3xl md:text-4xl lg:text-5xl font-display text-black mb-3 font-bold">24/7</div>
            <div className="text-sm text-text-secondary">Monitoring</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Products Section ─────────────────────────────────────────────────────────
function ProductsSection({ onBookDemo }: { onBookDemo: () => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const products = [
    {
      title: "GridGuard Data Engine",
      description: "Proven data, evaluations, and outcomes delivered to your infrastructure.",
      features: ["Real-time monitoring", "Predictive analytics", "Comprehensive reporting"]
    },
    {
      title: "GridGuard Platform",
      description: "Full-stack infrastructure protection with world-class deployment.",
      features: ["Automated isolation", "Zero collateral impact", "Scalable architecture"]
    },
    {
      title: "GridGuard Government",
      description: "Enterprise-grade solutions for public sector energy infrastructure.",
      features: ["Compliance ready", "Secure deployment", "Government SLAs"]
    },
  ];

  return (
    <section ref={ref} id="products" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-display text-display-md text-black mb-6">
            GridGuard for Enterprise
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Full-Stack Infrastructure Solutions. Outcomes delivered with world-class data, models, and deployment.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8" ref={ref}>
          {products.map((product, index) => (
            <motion.div
              key={product.title}
              ref={(el) => {
                if (el) {
                  gsap.fromTo(el, 
                    {
                      opacity: 0,
                      y: 60,
                      scale: 0.9
                    },
                    {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      duration: 1,
                      delay: index * 0.2,
                      ease: "power3.out",
                      scrollTrigger: {
                        trigger: el,
                        start: "top 80%",
                        end: "bottom 20%",
                        toggleActions: "play none none reverse"
                      }
                    }
                  );
                }
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.15 }}
              whileHover={{ scale: 1.05 }}
              className="border border-border rounded-2xl p-8 hover:border-black transition-colors cursor-pointer group"
            >
              <h3 className="text-xl font-display text-black mb-4 group-hover:text-primary transition-colors">
                {product.title}
              </h3>
              <p className="text-text-secondary mb-6">{product.description}</p>
              <ul className="space-y-2">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-black" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBookDemo}
            className="px-8 py-4 border-2 border-black text-black font-semibold rounded-xl hover:bg-black hover:text-white transition-all"
          >
            Book a Demo
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

// ── Technology Stack Section ────────────────────────────────────────────────
function TechStackSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const technologies = [
    { name: "Huawei Cloud", category: "Infrastructure" },
    { name: "ModelArts", category: "AI/ML Platform" },
    { name: "GaussDB", category: "Database" },
    { name: "MindSpore", category: "AI Framework" },
    { name: "CCE Kubernetes", category: "Container Orchestration" },
    { name: "IoTDA", category: "Device Management" },
  ];

  return (
    <section ref={ref} id="resources" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-display text-display-md text-black mb-4">
            Built on Modern Technology
          </h2>
          <p className="text-text-secondary max-w-3xl mx-auto">
            GridGuard leverages Huawei Cloud enterprise services for reliable, scalable infrastructure monitoring.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col items-center p-6 border border-border rounded-xl bg-white"
            >
              <span className="text-sm font-mono text-primary mb-2">{tech.category}</span>
              <span className="text-lg font-medium text-text">{tech.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Showcase/Work Section ─────────────────────────────────────────────────
function ShowcaseSection() {
  const [modal, setModal] = useState({ active: false, index: 0 });
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const projectsRef = useRef<HTMLDivElement>(null);

  const projects = [
    { title: "Municipal Grid Network", category: "Smart City", image: "/Smart_City.webp" },
    { title: "Industrial Power Plant", category: "Energy", image: "/Industrial_Power_Plant.webp" },
    { title: "Residential Complex", category: "Utilities", image: "/residential complex.webp" },
    { title: "Commercial District", category: "Infrastructure", image: "/commercial_disctrict.webp" },
  ];

  useEffect(() => {
    // Stagger animation for project cards
    if (projectsRef.current) {
      const cards = projectsRef.current.querySelectorAll('.project-card');
      gsap.fromTo(cards, 
        {
          opacity: 0,
          x: -80,
          rotation: -3
        },
        {
          opacity: 1,
          x: 0,
          rotation: 0,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: projectsRef.current,
            start: "top 75%",
            end: "bottom 25%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // Hover scale effect with GSAP
      cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
          gsap.to(card, { scale: 1.02, duration: 0.3, ease: "power2.out" });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, duration: 0.3, ease: "power2.out" });
        });
      });
    }
  }, []);

  return (
    <section ref={ref} id="work" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <div>
            <span className="text-xs font-mono text-primary tracking-widest uppercase mb-4 block">Selected Work</span>
            <h2 className="text-display text-display-md text-text">Protected Networks</h2>
          </div>
          <p className="text-text-secondary max-w-md">
            From municipal grids to industrial complexes, we protect energy infrastructure across diverse environments.
          </p>
        </motion.div>

        <div ref={projectsRef} className="relative">
          {projects.map((project, index) => (
            <div key={project.title} className="project-card">
              <ProjectCard
                title={project.title}
                category={project.category}
                image={project.image}
                index={index}
                setModal={setModal}
              />
            </div>
          ))}

          {/* Hover Modal */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: modal.active ? 1 : 0,
              opacity: modal.active ? 1 : 0,
            }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
            className="fixed w-80 h-60 rounded-2xl overflow-hidden pointer-events-none z-50 hidden md:block"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="w-full h-full transition-transform duration-500"
              style={{ transform: `translateY(-${modal.index * 100}%)` }}
            >
              {projects.map((project, i) => (
                <div
                  key={i}
                  className="w-full h-full"
                >
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Features Section ───────────────────────────────────────────────────────
function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const featuresRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      number: "01",
      title: "Real-Time Detection",
      description: "Advanced monitoring systems analyse thousands of grid nodes simultaneously, flagging anomalies within milliseconds of occurrence.",
    },
    {
      number: "02",
      title: "Surgical Isolation",
      description: "Precision auto-isolation cuts only the compromised segment — not the entire feeder. Zero collateral downtime guaranteed.",
    },
    {
      number: "03",
      title: "Cloud Scalability",
      description: "Enterprise-grade cloud infrastructure designed to scale from one municipality to an entire continent seamlessly.",
    },
    {
      number: "04",
      title: "Predictive Analytics",
      description: "Intelligent models predict potential threats before they occur, enabling preemptive protective measures.",
    },
  ];

  useEffect(() => {
    // Stagger animation for feature cards
    if (featuresRef.current) {
      const cards = featuresRef.current.querySelectorAll('.feature-item');
      gsap.fromTo(cards, 
        {
          opacity: 0,
          y: 80,
          scale: 0.95
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 75%",
            end: "bottom 25%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // Line draw animation
      const lines = featuresRef.current.querySelectorAll('.feature-line');
      gsap.fromTo(lines, 
        { width: 0 },
        {
          width: "100%",
          duration: 1.2,
          stagger: 0.2,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }
  }, []);

  return (
    <section ref={ref} id="enterprise" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <span className="text-xs font-mono text-primary tracking-widest uppercase mb-4 block">Capabilities</span>
          <h2 className="text-display text-display-md text-text max-w-2xl">
            Four Engines. One Mission.
          </h2>
        </motion.div>

        <div ref={featuresRef} className="space-y-32">
          {features.map((feature, index) => (
            <div key={feature.number} className="feature-item">
              <FeatureCard {...feature} index={index} />
              {index < features.length - 1 && (
                <div className="feature-line h-px bg-border mt-16 origin-left" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Key Benefits Section ────────────────────────────────────────────────────
function BenefitsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const benefits = [
    {
      title: "Real-time Monitoring",
      description: "Continuous surveillance of grid infrastructure with instant anomaly detection and alerting."
    },
    {
      title: "AI-Powered Analysis",
      description: "Machine learning models process telemetry data to identify patterns and predict potential issues."
    },
    {
      title: "Automated Response",
      description: "Configurable automated actions to isolate problems and prevent cascading failures."
    },
  ];

  return (
    <section ref={ref} id="government" className="py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center"
        >
          <span className="text-xs font-mono text-primary tracking-widest uppercase mb-4 block">Capabilities</span>
          <h2 className="text-display text-display-md text-text">How GridGuard Works</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="p-8 border border-border rounded-2xl bg-cream"
            >
              <h3 className="text-xl font-display text-text mb-4">{benefit.title}</h3>
              <p className="text-text-secondary leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Book Demo Section ────────────────────────────────────────────────────────
function BookDemoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const demoRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Stagger animation for demo section elements
    if (demoRef.current) {
      const leftContent = demoRef.current.querySelector('.demo-left');
      const rightForm = demoRef.current.querySelector('.demo-right');
      const features = demoRef.current.querySelectorAll('.demo-feature');

      gsap.fromTo(leftContent, 
        { opacity: 0, x: -60 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: demoRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse"
          }
        }
      );

      gsap.fromTo(features, 
        { opacity: 0, x: -40, y: 20 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          delay: 0.3,
          ease: "power3.out",
          scrollTrigger: {
            trigger: demoRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse"
          }
        }
      );

      gsap.fromTo(rightForm, 
        { opacity: 0, x: 60, scale: 0.95 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 1,
          delay: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: demoRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setIsSubmitted(true);
  };

  return (
    <section ref={ref} id="demo" className="py-32 bg-cream">
      <div ref={demoRef} className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="demo-left">
            <span className="text-xs font-mono text-primary tracking-widest uppercase mb-4 block">Schedule</span>
            <h2 className="text-display text-display-md text-text mb-6">
              Book Your Demo
            </h2>
            <p className="text-text-secondary text-lg mb-8 max-w-md">
              See how GridGuard protects energy infrastructure in real-time. Schedule a personalized demonstration with our team.
            </p>

            <div className="space-y-6">
              <div className="demo-feature flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-text">30-Minute Session</h4>
                  <p className="text-text-secondary text-sm">Comprehensive walkthrough of all features</p>
                </div>
              </div>

              <div className="demo-feature flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-text">Expert Consultation</h4>
                  <p className="text-text-secondary text-sm">Tailored to your infrastructure needs</p>
                </div>
              </div>

              <div className="demo-feature flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-text">Flexible Scheduling</h4>
                  <p className="text-text-secondary text-sm">Book at a time that works for you</p>
                </div>
              </div>
            </div>
          </div>

          <div className="demo-right">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 md:p-10 border border-border shadow-xl">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Work Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="john@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Company</label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="Company Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Message (Optional)</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:outline-none transition-colors resize-none"
                      placeholder="Tell us about your infrastructure needs..."
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-8 py-4 bg-gradient-to-r from-white to-gray-50 text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-gray-50 hover:to-gray-100 transition-all shadow-lg border border-gray-200"
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="text-primary">Schedule Demo</span>
                  </motion.button>
                </div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-8 md:p-10 border border-border shadow-xl text-center space-y-6"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold text-black">
                    Demo Scheduled!
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Thank you, <span className="font-semibold text-black">{formData.name}</span>. We've sent a calendar invitation and connection details to <span className="font-semibold text-black">{formData.email}</span>.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ──────────────────────────────────────────────────────────────
function CTASection({ onBookDemo }: { onBookDemo: () => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const ctaRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parallax effect for CTA content
    if (ctaRef.current) {
      gsap.fromTo(ctaRef.current, 
        {
          opacity: 0,
          y: 100,
          scale: 0.8
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: "power4.out",
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    // Faster marquee animation on scroll
    if (marqueeRef.current) {
      gsap.to(marqueeRef.current, {
        x: "-50%",
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 2
        }
      });
    }
  }, []);

  return (
    <section ref={ref} className="py-32 bg-text text-white overflow-hidden relative">
      {/* Background Marquee */}
      <div ref={marqueeRef} className="absolute inset-0 flex items-center opacity-5 pointer-events-none">
        <MarqueeText text="SECURE YOUR GRID" speed={15} />
      </div>

      <div ref={ctaRef} className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-display text-display-md mb-6">
            Ready to Protect Your Infrastructure?
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            Join leading organizations safeguarding their energy assets with GridGuard.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBookDemo}
              className="px-8 py-4 bg-gradient-to-r from-white to-gray-50 text-black font-semibold rounded-xl flex items-center gap-2 hover:from-gray-50 hover:to-gray-100 transition-all shadow-lg border border-gray-200"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-primary">Book a Demo</span>
            </motion.button>
            <Link href="/contact">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-white to-gray-50 text-black font-semibold rounded-xl flex items-center gap-2 hover:from-gray-50 hover:to-gray-100 transition-all shadow-lg border border-gray-200"
              >
                <span className="text-primary">Contact Sales</span>
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  const footerRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const footerContentRef = useRef<HTMLElement>(null);

  const links = {
    Products: ["GridGuard Data Engine", "GridGuard Platform", "GridGuard Government"],
    Company: ["About", "Careers", "Security", "Terms"],
    Resources: ["Blog", "Contact Us", "Events", "Documentation"],
    Guides: ["Grid Protection", "Energy Security", "Infrastructure", "Compliance"],
  };

  useEffect(() => {
    const miniNavContainer = footerRef.current;
    const expandedDrawer = drawerRef.current;
    if (!miniNavContainer || !expandedDrawer) return;

    const miniNav = miniNavContainer.querySelector('.mini-nav') as HTMLElement | null;
    if (!miniNav) return;

    // Initially hide mini nav completely (not visible at hero)
    gsap.set(miniNavContainer, { opacity: 0, y: 20, display: 'flex' });
    gsap.set(expandedDrawer, { height: 0, opacity: 0 });

    const footerContent = footerContentRef.current;
    if (!footerContent) return;

    // Progress-based scroll animation
    const scrollTriggerInstance = ScrollTrigger.create({
      trigger: document.body,
      start: () => `top -${document.body.scrollHeight - window.innerHeight - 1000}`,
      end: "bottom bottom",
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        
        // First 70%: mini nav gradually appears (after Trusted by, through CTA and white space)
        if (progress <= 0.7) {
          const miniProgress = progress / 0.7;
          gsap.set(miniNavContainer, {
            opacity: miniProgress,
            y: 20 - (miniProgress * 20),
          });
        }
        // Last 30%: gradual expand to full footer that fills the space
        else if (progress > 0.7) {
          const expandProgress = (progress - 0.7) / 0.3;
          
          // Gradually fade out mini nav as footer expands
          gsap.set(miniNavContainer, {
            opacity: 1 - expandProgress,
            y: -expandProgress * 20,
          });
          
          // Expand footer content gradually - fills entire space
          if (expandProgress > 0.05 && expandedDrawer.clientHeight === 0) {
            gsap.set(expandedDrawer, { height: "auto" });
          }
          
          if (expandedDrawer.clientHeight > 0) {
            gsap.set(expandedDrawer, {
              opacity: expandProgress,
              y: 30 - (expandProgress * 30),
            });
          }
        }
      },
    });

    return () => {
      scrollTriggerInstance.kill();
    };
  }, []);

  return (
    <>
      {/* Fixed Floating Mini Nav - Always visible until footer section */}
      <div
        ref={footerRef}
        className="mini-nav-container fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="mini-nav bg-black/90 backdrop-blur-sm rounded-full px-5 py-3 shadow-2xl shadow-black/20 flex items-center gap-4 pointer-events-auto whitespace-nowrap">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
              <img src="/Logo.webp" alt="GridGuard" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-display text-sm tracking-tight text-white font-medium">
              GridGuard
            </span>
          </Link>
          
          <div className="w-px h-4 bg-white/20" />
          
          <div className="flex items-center gap-2 text-white/60">
            <span className="text-xs hidden sm:block">More</span>
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-xs text-white">+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Footer - At bottom of page, fills remaining space */}
      <footer ref={footerContentRef} className="relative w-full bg-white flex-grow">
        <div 
          ref={drawerRef} 
          className="expanded-drawer overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-16 pt-8 pb-12 min-h-screen">
            <div className="grid md:grid-cols-5 gap-12 mb-12">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                    <img src="/Logo.webp" alt="GridGuard" className="w-6 h-6 object-contain" />
                  </div>
                  <span className="font-display text-lg tracking-tight text-black font-medium">
                    GridGuard
                  </span>
                </div>
                <p className="text-text-secondary text-sm max-w-sm mb-6">
                  The future of your industry starts here. Enterprise-grade protection for critical energy infrastructure.
                </p>

                <div className="space-y-4">
                  <p className="text-xs text-text-secondary">
                    Certified compliant with:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["FedRAMP", "ISO 27001", "SOC 2", "GDPR"].map((cert) => (
                      <span key={cert} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-black">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {Object.entries(links).map(([category, items]) => {
                const getFooterHref = (item: string) => {
                  switch (item) {
                    case "GridGuard Data Engine":
                      return "#products";
                    case "GridGuard Platform":
                      return "#enterprise";
                    case "GridGuard Government":
                      return "#government";
                    case "Blog":
                      return "/blog";
                    case "Contact Us":
                      return "#demo";
                    case "Documentation":
                      return "/compliance";
                    case "Grid Protection":
                      return "#enterprise";
                    case "Energy Security":
                      return "#enterprise";
                    case "Infrastructure":
                      return "#enterprise";
                    case "Compliance":
                      return "/compliance";
                    case "About":
                      return "/blog";
                    case "Careers":
                      return "/blog";
                    case "Security":
                      return "/compliance";
                    case "Terms":
                      return "/compliance";
                    default:
                      return "#";
                  }
                };

                return (
                  <div key={category}>
                    <h4 className="font-semibold text-black text-sm mb-4">{category}</h4>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item}>
                          <Link href={getFooterHref(item)} className="text-text-secondary hover:text-black transition-colors text-sm">
                            {item}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="pt-8 border-t border-border">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-text-muted">
                    © 2026 GridGuard, Inc. All rights reserved.
                  </p>
                  <div className="flex gap-4 text-sm">
                    <Link href="#" className="text-text-muted hover:text-black transition-colors">
                      Terms of Use
                    </Link>
                    <Link href="#" className="text-text-muted hover:text-black transition-colors">
                      Privacy Policy
                    </Link>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-text-muted max-w-md">
                  <p>
                    This website uses cookies and similar technologies to ensure functionality and evaluate website usage.
                  </p>
                  <div className="flex gap-4">
                    <Link href="#" className="hover:text-black transition-colors">
                      Cookie Policy
                    </Link>
                    <Link href="#" className="hover:text-black transition-colors">
                      Manage Cookies
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    size: "100-500",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setIsSubmitted(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-white rounded-3xl p-8 md:p-10 shadow-2xl border border-gray-100 z-10 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <span className="text-xs font-mono text-primary tracking-widest uppercase mb-2 block">
                    Experience GridGuard AI
                  </span>
                  <h3 className="text-3xl font-display font-bold text-black leading-tight">
                    Book a Live Demo
                  </h3>
                  <p className="text-gray-500 text-sm mt-2">
                    Schedule a personalized walk-through with our systems engineers.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-black focus:border-primary focus:outline-none transition-colors"
                      placeholder="e.g. Shawn Chareka"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-black focus:border-primary focus:outline-none transition-colors"
                      placeholder="shawn@gridguard.co.za"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-black focus:border-primary focus:outline-none transition-colors"
                        placeholder="GridGuard ZA"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                        Grid Size (Poles)
                      </label>
                      <select
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-black focus:border-primary focus:outline-none transition-colors appearance-none bg-white"
                      >
                        <option value="under-100">Under 100</option>
                        <option value="100-500">100 - 500</option>
                        <option value="500-2000">500 - 2,000</option>
                        <option value="over-2000">2,000+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                      Special Requirements (Optional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-black focus:border-primary focus:outline-none transition-colors resize-none"
                      placeholder="e.g. Interested in high-impedance fault auto-isolation..."
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-primary text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-primary/95 transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Confirm Demo Booking</span>
                </motion.button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-display font-bold text-black">
                    You're Booked!
                  </h3>
                  <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Thank you, <span className="font-semibold text-black">{formData.name}</span>. We've sent a calendar invitation and connection details to <span className="font-semibold text-black">{formData.email}</span>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    onClose();
                  }}
                  className="px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors"
                >
                  Close Window
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <main className="bg-white overflow-x-hidden flex flex-col min-h-screen">
      <Navigation onBookDemo={() => setIsDemoModalOpen(true)} />
      <HeroSection />
      <SystemCapabilitiesSection />
      <ProductsSection onBookDemo={() => setIsDemoModalOpen(true)} />
      <TechStackSection />
      <ShowcaseSection />
      <FeaturesSection />
      <BenefitsSection />
      <CTASection onBookDemo={() => setIsDemoModalOpen(true)} />
      {/* White space area - mini nav floats here before footer expands */}
      <div className="h-24 bg-white flex-shrink-0" />
      <Footer />

      <DemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </main>
  );
}
