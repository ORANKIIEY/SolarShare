"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { inputCls, Panel, primaryBtn } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/operator/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      const next = params.get("next");
      router.replace(next && next.startsWith("/solar/operator") ? next : "/solar/operator");
      router.refresh();
    } else {
      setError(res?.status === 429 ? "Too many tries. Wait a few minutes." : "Wrong password.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="pw" className="block text-sm font-medium mb-1.5">
          Operator password
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          aria-describedby="pw-hint"
        />
        <p id="pw-hint" className="text-xs text-zinc-400 mt-1.5">
          Demo login. The password is OPERATOR_PASSWORD in Frontend/.env.local on the server.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !password} className={primaryBtn}>
        {busy ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="w-4 h-4" aria-hidden="true" />}
        Sign in
      </button>
    </form>
  );
}

export default function OperatorLogin() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-md space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Operator sign-in</h1>
      <Panel>
        <Suspense>
          <LoginForm />
        </Suspense>
      </Panel>
    </div>
  );
}
