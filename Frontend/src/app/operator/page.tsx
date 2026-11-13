"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OperatorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/solar/operator");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">
          Redirecting to SolarShare Operator Console...
        </p>
      </div>
    </div>
  );
}
