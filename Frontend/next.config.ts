import type { NextConfig } from "next";
import path from "path";

/**
 * SolarShare Next.js Configuration
 * Configured with strict security headers, Base Sepolia Web3 RPC connectivity, and standalone container output.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },

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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://raw.githubusercontent.com",
              "connect-src 'self' https://sepolia.base.org https://*.base.org https://sepolia.basescan.org https://api-sepolia.basescan.org wss: ws:",
              "frame-src 'self' https://www.openstreetmap.org",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
