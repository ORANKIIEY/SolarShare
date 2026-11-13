"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
// reCAPTCHA removed — replaced by Huawei WAF bot protection (Project_Work_Breakdown: Auth0 → IAM with MFA integration)
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  AlertTriangle,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { apiLogin, apiVerifyCaptcha } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

// ── Floating Label Input ─────────────────────────────────────────────────────
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
function FloatingInput({
  id, type, label, value, onChange, error, icon, trailing, autoComplete,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className="relative">
      <motion.div
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35, type: "spring" }}
        className={`relative border rounded-lg transition-all duration-200 overflow-hidden
          ${error
            ? "border-danger shadow-[0_0_0_2px_rgba(255,69,58,0.2)]"
            : focused
              ? "border-primary shadow-[0_0_0_2px_rgba(220,38,38,0.15)]"
              : "border-border"
          }
        `}
      >
        {/* Floating label */}
        <label
          htmlFor={id}
          className={`absolute left-10 transition-all duration-200 pointer-events-none font-mono select-none
            ${floated
              ? "top-1.5 text-[9px] tracking-widest uppercase text-primary"
              : "top-1/2 -translate-y-1/2 text-sm text-text-muted"
            }
          `}
        >
          {label}
        </label>
        {/* Left icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-white text-text text-sm pt-5 pb-2 px-3 pl-10 pr-10 focus:outline-none font-mono placeholder:text-transparent"
        />
        {trailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 text-[10px] font-mono text-danger flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Social Button ────────────────────────────────────────────────────────────
function SocialButton({ label, logo, onClick }: { label: string; logo: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, borderColor: "rgba(220,38,38,0.35)" }}
      whileTap={{ scale: 0.97 }}
      className="flex-1 flex items-center justify-center gap-2.5 py-2.5 border border-border rounded-lg text-xs font-mono text-text-secondary hover:text-text transition-colors bg-white"
      onClick={onClick}
    >
      {logo}
      {label}
    </motion.button>
  );
}

const HuaweiLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-3.67L7.77 14.9 7 13.6l3.23-2.1L7 9.4l.77-1.3 3.23 2.07V6.5h1.5v3.67L15.23 8.1 16 9.4l-3.23 2.1L16 13.6l-.77 1.3-3.23-2.07V16.5H11z" />
  </svg>
);

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showAccessLogin, setShowAccessLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; api?: string }>({});
  const [isChecking, setIsChecking] = useState(true);

  // Huawei Cloud OneAccess CAPTCHA state variables
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const [targetX, setTargetX] = useState(160);
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(() => "oneaccess-token-" + Math.random().toString(36).substring(2, 10));

  // Initialize random target coordinate on mount
  useEffect(() => {
    setTargetX(Math.floor(Math.random() * 120) + 100); // 100px to 220px
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("solarshare_token");
    if (token) {
      router.replace("/solar");
    } else {
      setIsChecking(false);
    }
  }, [router]);

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Operator ID is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email format";
    if (!password) e.password = "Access key is required";
    else if (password.length < 6) e.password = "Access key must be ≥ 6 characters";
    return e;
  };

  const verifyCaptchaCode = async (xValue: number) => {
    if (Math.abs(xValue - targetX) < 10) {
      try {
        const res = await apiVerifyCaptcha(
          JSON.stringify({ x: xValue, y: 5.0 }),
          captchaToken,
          email || "operator@solarshare.co.za"
        );
        if (res) {
          setCaptchaVerified(true);
          setCaptchaError("");
          showToast("Security CAPTCHA verified", "success");
        } else {
          setSliderX(0);
          setCaptchaError("Verification failed. Please try again.");
          showToast("Verification failed", "error");
        }
      } catch {
        setCaptchaVerified(true);
        setCaptchaError("");
      }
    } else {
      setSliderX(0);
      setCaptchaError("OneAccess rejected CAPTCHA code coordinates.");
      showToast("Verification failed", "error");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!captchaVerified) {
      setCaptchaError("Please slide the puzzle to verify the CAPTCHA code.");
      showToast("CAPTCHA verification required", "error");
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiLogin(email, password);
      if (result) {
        localStorage.setItem("solarshare_token", result.token);
        localStorage.setItem("solarshare_user", JSON.stringify(result.user));
        document.cookie = `solarshare_token=${result.token}; path=/; SameSite=Lax`;
        document.cookie = `solarshare_user=${encodeURIComponent(JSON.stringify(result.user))}; path=/; SameSite=Lax`;
        // Route based on user role
        switch (result.user.role) {
          case "operator":
            router.push("/operator");
            break;
          case "investor":
            router.push("/solar");
            break;
          case "worker":
            router.push("/worker");
            break;
          case "governance":
            router.push("/governance");
            break;
          case "dev":
            router.push("/dev");
            break;
          case "admin":
          default:
            router.push("/operator");
            break;
        }
      } else {
        setErrors({ api: "Invalid credentials. Check your email and access key." });
        showToast("Incorrect email or password", "error");
        setIsLoading(false);
      }
    } catch {
      setErrors({ api: "Connection error. Is the backend running?" });
      showToast("Incorrect email or password", "error");
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-sm bg-primary animate-spin"></div>
          <p className="text-text-muted font-mono text-xs uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div
        className="rounded-3xl border border-border bg-white/80 backdrop-blur-xl p-7 md:p-8"
        style={{ boxShadow: "0 30px 80px -30px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.03)" }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display tracking-tight text-text leading-tight">
              Sign in
            </h1>
            <p className="text-sm text-text-secondary">
              Sign in to access SolarShare.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center overflow-hidden">
              <Sun className="w-6 h-6" />
            </div>
          </div>
        </div>

        {errors.api && (
          <div className="mt-5 px-3 py-2.5 rounded-xl bg-danger/5 border border-danger/20">
            <p className="text-[11px] font-mono text-danger flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errors.api}
            </p>
          </div>
        )}

        {/* Partner SSO */}
        <div className="mt-6 space-y-3">
          <SocialButton
            label="Continue with Single Sign-On"
            logo={<Lock className="w-4 h-4 text-gray-700" />}
            onClick={async () => {
              const verifier = [...crypto.getRandomValues(new Uint8Array(32))]
                .map(b => ("0" + b.toString(16)).slice(-2))
                .join("");
              const enc = new TextEncoder();
              const data = enc.encode(verifier);
              const buf = await crypto.subtle.digest("SHA-256", data);
              const hashArray = Array.from(new Uint8Array(buf));
              const challenge = btoa(String.fromCharCode(...hashArray))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");
              sessionStorage.setItem("solarshare_pkce_verifier", verifier);
              const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || "/login";
              const params = new URLSearchParams({
                client_id: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID || "",
                redirect_uri: `${window.location.origin}/auth/callback`,
                response_type: "code",
                scope: "openid email profile",
                code_challenge: challenge,
                code_challenge_method: "S256"
              });
              window.location.href = `${authUrl}?${params.toString()}`;
            }}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => setShowAccessLogin((v) => !v)}
            className="text-[10px] font-mono text-text-muted tracking-widest hover:text-text transition-colors"
          >
            {showAccessLogin ? "HIDE ACCESS KEY" : "USE ACCESS KEY"}
          </button>
          <div className="flex-1 h-px bg-border" />
        </div>

        <AnimatePresence initial={false}>
          {showAccessLogin && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <form onSubmit={handleLogin} className="pt-6 space-y-4" noValidate>
                <div className="space-y-4">
                  <FloatingInput
                    id="email"
                    type="email"
                    label="Operator Email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    autoComplete="email"
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <FloatingInput
                    id="password"
                    type={showPass ? "text" : "password"}
                    label="Access Key"
                    value={password}
                    onChange={setPassword}
                    error={errors.password}
                    autoComplete="current-password"
                    icon={<Lock className="w-4 h-4" />}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="text-text-muted hover:text-text transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        className="relative w-4 h-4 border border-border rounded flex-shrink-0 cursor-pointer transition-colors"
                        style={{ borderColor: rememberMe ? "#dc2626" : undefined, backgroundColor: rememberMe ? "rgba(220,38,38,0.10)" : undefined }}
                        onClick={() => setRememberMe(!rememberMe)}
                      >
                        {rememberMe && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div className="w-2 h-2 rounded-sm bg-primary" />
                          </motion.div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-text-muted group-hover:text-text-secondary transition-colors select-none">Remember Me</span>
                    </label>
                    <Link href="#" className="text-[11px] font-mono text-text-muted hover:text-primary transition-colors">
                      Forgot access key?
                    </Link>
                  </div>
                </div>

                {/* Security Verification CAPTCHA Slider Widget */}
                <div className="mt-4 space-y-2 select-none">
                  <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                    <span className="uppercase tracking-widest text-primary font-bold">SECURITY VERIFICATION CAPTCHA</span>
                    {captchaVerified ? (
                      <span className="text-emerald-600 font-bold">✓ VERIFIED</span>
                    ) : (
                      <span className="text-text-muted">Slide to match coordinate</span>
                    )}
                  </div>

                  <div 
                    className="h-20 bg-neutral-50 border border-neutral-200 rounded-xl relative overflow-hidden flex items-center justify-between"
                    style={{ backgroundImage: "radial-gradient(#e5e5e5 1px, transparent 1px)", backgroundSize: "12px 12px" }}
                  >
                    {/* Target slot (puzzle piece target) */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-dashed border-red-400 bg-red-100/30 rounded-lg flex items-center justify-center transition-all duration-200"
                      style={{ left: `${targetX}px` }}
                    >
                      <div className="w-4 h-4 bg-red-200/50 rounded-sm" />
                    </div>

                    {/* Dragged block (puzzle piece slider) */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-lg shadow-md flex items-center justify-center transition-all duration-75"
                      style={{ left: `${sliderX}px` }}
                    >
                      <div className="w-3 h-3 bg-white rounded-sm" />
                    </div>

                    {!captchaVerified && sliderX === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Slide piece to puzzle lock</span>
                      </div>
                    )}
                  </div>

                  {/* Slider bar */}
                  <div 
                    className="h-10 bg-neutral-100 border border-neutral-200 rounded-xl relative flex items-center overflow-hidden"
                    id="captcha-track"
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-75"
                      style={{ width: `${sliderX + 20}px` }}
                    />
                    
                    <div 
                      className="absolute top-0.5 bottom-0.5 w-12 bg-primary text-white flex items-center justify-center rounded-lg shadow-md cursor-grab active:cursor-grabbing transition-all duration-75"
                      style={{ left: `${sliderX}px` }}
                      onMouseDown={(e) => {
                        if (captchaVerified) return;
                        setIsDragging(true);
                        const startX = e.clientX;
                        const initialSliderX = sliderX;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          // track width is about 320px, minus handle width (48px)
                          const newX = Math.min(Math.max(initialSliderX + deltaX, 0), 260);
                          setSliderX(newX);
                        };
                        
                        const handleMouseUp = (upEvent: MouseEvent) => {
                          document.removeEventListener("mousemove", handleMouseMove);
                          document.removeEventListener("mouseup", handleMouseUp);
                          setIsDragging(false);
                          
                          // Verify
                          const finalX = Math.min(Math.max(initialSliderX + (upEvent.clientX - startX), 0), 260);
                          verifyCaptchaCode(finalX);
                        };
                        
                        document.addEventListener("mousemove", handleMouseMove);
                        document.addEventListener("mouseup", handleMouseUp);
                      }}
                      onTouchStart={(e) => {
                        if (captchaVerified) return;
                        setIsDragging(true);
                        const startX = e.touches[0].clientX;
                        const initialSliderX = sliderX;
                        
                        const handleTouchMove = (moveEvent: TouchEvent) => {
                          const deltaX = moveEvent.touches[0].clientX - startX;
                          const newX = Math.min(Math.max(initialSliderX + deltaX, 0), 260);
                          setSliderX(newX);
                        };
                        
                        const handleTouchEnd = (endEvent: TouchEvent) => {
                          document.removeEventListener("touchmove", handleTouchMove);
                          document.removeEventListener("touchend", handleTouchEnd);
                          setIsDragging(false);
                          
                          // Verify with latest sliderX
                          verifyCaptchaCode(sliderX);
                        };
                        
                        document.addEventListener("touchmove", handleTouchMove);
                        document.addEventListener("touchend", handleTouchEnd);
                      }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </div>
                    
                    <div className="w-full text-center pointer-events-none">
                      <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
                        {captchaVerified ? "OneAccess verified" : isDragging ? "Align the slots..." : "Drag slider right"}
                      </span>
                    </div>
                  </div>

                  {captchaError && (
                    <p className="text-[10px] font-mono text-danger flex items-center gap-1.5 pt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {captchaError}
                    </p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={!isLoading ? { scale: 1.02, boxShadow: "0 0 30px rgba(220,38,38,0.18)" } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  className="w-full px-8 py-4 bg-gradient-to-r from-white to-gray-50 text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-gray-50 hover:to-gray-100 transition-all shadow-lg border border-gray-200 text-sm disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <motion.span
                      className="font-mono"
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      AUTHENTICATING...
                    </motion.span>
                  ) : (
                    <>
                      <span className="text-primary">Sign in</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-6">
          <p className="text-xs font-mono text-text-muted">
            New operator?{" "}
            <Link href="/signup" className="text-primary hover:text-black transition-colors">
              Request clearance →
            </Link>
          </p>
          <p className="text-[10px] font-mono text-text-muted text-right">
            Authorised personnel only.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-danger/5 border border-danger/20">
        <AlertTriangle className="w-3 h-3 text-danger shrink-0 mt-0.5" />
        <p className="text-[10px] text-text-secondary font-mono leading-relaxed">
          Unauthorised access is a criminal offence under the Cybercrimes Act 19 of 2020. All sessions
          are logged and geolocated.
        </p>
      </div>
    </motion.div>
  );
}
