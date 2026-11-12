"use client";

import { DevSidebar } from "@/components/layout/DevSidebar";
import { useAuth } from "@/hooks/useAuth";

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth('dev');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-black font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <DevSidebar />
      <main className="flex-1 overflow-y-auto custom-scroll bg-gray-100">
        {children}
      </main>
    </div>
  );
}
