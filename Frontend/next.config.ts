import type { NextConfig } from "next";
import path from "path";

// Work Breakdown: Vercel/Netlify \u2192 Huawei Cloud Application Engine (CAE)
// `output: 'standalone'` creates a self-contained server bundle for Docker/CAE.
// The Dockerfile in this directory copies `.next/standalone` for the final image.
const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Security headers \u2014 complement Huawei WAF OWASP rule set
  // (Work Breakdown: Zero Trust Architecture, WAF rate limiting)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            // Tiles served via Huawei CDN from OpenStreetMap origin
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: *.tile.openstreetmap.org tile.openstreetmap.org *.myhuaweicloud.com https://cdnjs.cloudflare.com",
              "connect-src 'self' *.myhuaweicloud.com wss: ws:",
              "frame-src 'self' https://www.openstreetmap.org https://www.google.com",
              "font-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
