import type { NextConfig } from "next";
import hosts from "./src/lib/hosts.json";

const CONNECT_HOSTS = [
  ...new Set([...hosts.readRpcs, ...hosts.logRpcs.map((r) => r.url), hosts.documentHost]),
];
const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: the page may only load its own files and talk to the
// test-network endpoints and document host listed in src/lib/hosts.json.
const csp = [
  "default-src 'self'",
  // Next.js needs inline scripts; the dev server also needs eval for fast refresh.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${CONNECT_HOSTS.join(" ")}${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Self-contained server bundle, used by the Dockerfile.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
