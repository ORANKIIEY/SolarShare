"use client";

import { GovernanceSidebar } from "@/components/layout/GovernanceSidebar";
import { useAuth } from "@/hooks/useAuth";

export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth('governance');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-black font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <GovernanceSidebar />
      <main className="flex-1 overflow-y-auto custom-scroll bg-gray-100">
        {children}
      </main>
    </div>
  );
}
