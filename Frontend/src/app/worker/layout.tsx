"use client";

import { WorkerSidebar } from "@/components/layout/WorkerSidebar";
import { useAuth } from "@/hooks/useAuth";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth('worker');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-void">
        <div className="text-acid font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-void">
      <WorkerSidebar />
      <main className="flex-1 overflow-y-auto custom-scroll">
        {children}
      </main>
    </div>
  );
}
