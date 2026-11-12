"use client";

"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function HuaweiInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const code = sp.get("code");
    const error = sp.get("error");
    const run = async () => {
      if (error) {
        router.replace("/login");
        return;
      }
      if (!code) return;
      const verifier = sessionStorage.getItem("gg_pkce_verifier_huawei") ?? "";
      const redirectUri = `${window.location.origin}/auth/huawei`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/oauth/huawei/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri, codeVerifier: verifier }),
      });
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      localStorage.setItem("gridguard_token", data.token);
      localStorage.setItem("gridguard_user", JSON.stringify(data.user));
      sessionStorage.removeItem("gg_pkce_verifier_huawei");
      router.replace("/admin");
    };
    run();
  }, [router, sp]);

  return null;
}

export default function HuaweiCallbackPage() {
  return <Suspense fallback={null}><HuaweiInner /></Suspense>;
}
