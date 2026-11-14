import type { Metadata } from "next";
import Shell from "@/components/platform/Shell";

export const metadata: Metadata = {
  title: "SolarShare | Soweto Block A",
  description: "Buy shares, follow the meter live and claim payouts. Demo on a test network: no real money.",
};

export default function SolarLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
