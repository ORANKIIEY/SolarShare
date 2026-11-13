"use client";

/**
 * Google OAuth callback stub.
 * If a user lands here via an old link, send them to /login.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
