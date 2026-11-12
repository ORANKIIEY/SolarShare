"use client";

/**
 * Google OAuth callback removed.
 * Sole SSO provider is now Huawei IAM / AppGallery Connect.
 * (Project_Work_Breakdown: Auth0 → IAM with MFA integration)
 *
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
