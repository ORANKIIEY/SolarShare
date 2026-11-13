import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import CookieConsent from "@/components/CookieConsent";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolarShare | Community Solar Co-Ownership",
  description: "Buy a piece of a township solar mini-grid and earn monthly payouts from clean electricity sold to local homes and shops.",
  openGraph: {
    title: "SolarShare | Community Solar Co-Ownership",
    description: "Buy a piece of a township solar mini-grid and earn monthly payouts from clean electricity sold to local homes and shops.",
    url: "https://solarshare.co.za",
    siteName: "SolarShare",
    locale: "en_ZA",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <body className="font-sans bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-300">
        <ThemeProvider>
          <ToastProvider>
            {children}
            <CookieConsent />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
