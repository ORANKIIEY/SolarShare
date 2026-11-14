"use client";

// Sign up and buy shares (#21): phone (mocked code) -> ID check (mocked)
// -> account made in the background, approved and topped up by the sponsor
// -> buy in rand. No wallet, seed phrase or fee prompt ever shows.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Camera, Check, CircleCheck, IdCard, LoaderCircle, Minus, Plus, RotateCcw, TriangleAlert } from "lucide-react";
import type { Address, Hex } from "viem";
import { useAccount } from "@/components/chain/Account";
import { useChainData } from "@/components/chain/ChainData";
import { ExternalA, inputCls, Panel, primaryBtn, secondaryBtn } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { buyShares } from "@/lib/account";
import { errorCode, txUrl } from "@/lib/chain";
import { int, rand, usdcToNumber, usdcToRand } from "@/lib/format";

type Stage = "phone" | "id" | "setup" | "pending" | "buy" | "buying" | "done";

const validPhone = (p: string) => {
  const d = p.replace(/[\s-]/g, "");
  return /^0[6-8]\d{8}$/.test(d) || /^\+?27[6-8]\d{8}$/.test(d);
};

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Steps({ stage }: { stage: Stage }) {
  const { t } = useLang();
  const idx = stage === "phone" ? 0 : stage === "id" || stage === "setup" || stage === "pending" ? 1 : 2;
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Progress">
      {t.app.join.steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === idx ? "step" : undefined}>
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border ${
              i < idx ? "bg-emerald-600 border-emerald-600 text-white" : i === idx ? "bg-white text-black border-white" : "border-zinc-600 text-zinc-300"
            }`}
          >
            {i < idx ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
          </span>
          <span className={i === idx ? "text-white font-medium" : "text-zinc-400"}>{s}</span>
          {i < 2 && <span aria-hidden="true" className="w-6 h-px bg-zinc-700" />}
        </li>
      ))}
    </ol>
  );
}

function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { t } = useLang();
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-md border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
      <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-[12rem]">{text}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="underline underline-offset-4 font-medium min-h-11 sm:min-h-0">
          {t.app.join.retry}
        </button>
      )}
    </div>
  );
}

export default function JoinPage() {
  const { t } = useLang();
  const { ready, keyHex, address, profile, holding, create, refresh, reset } = useAccount();
  const { stats, refresh: refreshChain } = useChainData();

  const [stage, setStage] = useState<Stage>("phone");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  // phone step
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  // id step
  const [name, setName] = useState("");
  const [idPhoto, setIdPhoto] = useState(false);
  const [selfie, setSelfie] = useState(false);
  const [consent, setConsent] = useState(false);
  // buy step
  const [count, setCount] = useState(1);
  const [buyStep, setBuyStep] = useState<"approve" | "buy" | null>(null);
  const [result, setResult] = useState<{ shares: bigint; hashes: Hex[]; tookMs: number } | null>(null);
  const decided = useRef(false);

  // Pick the right starting step once we know whether this browser has an account.
  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    if (keyHex && address) {
      setStartedAt(profile?.startedAt ?? Date.now());
      void continueSetup(address);
    } else {
      setStartedAt(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (stage === "done") return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [stage]);

  const msg = (code: string) => t.app.errors[code] ?? t.app.errors.network;

  /** Approved? -> top up -> buy. Otherwise wait for the operator. */
  const continueSetup = useCallback(
    async (who: Address) => {
      setError(null);
      setStage("setup");
      try {
        const st = await fetch(`/api/applicants?address=${who}`).then((r) => r.json());
        if (st.status === "rejected") {
          setStage("pending");
          setError(t.app.join.rejected);
          return;
        }
        if (st.status !== "approved") {
          setStage("pending");
          return;
        }
        // Approved: ask the sponsor to cover fees and give test money.
        const sp = await fetch("/api/sponsor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: who }),
        }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
        if (!sp.body.ok && sp.body.error !== "WALLET_LIMIT") {
          const h = await refresh();
          // Already funded earlier? Carry on; otherwise explain.
          if (!h || h.usdc === 0n || h.eth === 0n) {
            setError(msg(sp.body.error ?? "network"));
            return;
          }
        }
        // Wait until the top-up is visible to our node.
        for (let i = 0; i < 10; i++) {
          const h = await refresh();
          if (h && h.usdc > 0n && h.eth > 0n) break;
          await new Promise((r) => setTimeout(r, 1500));
        }
        setStage("buy");
      } catch {
        setError(t.app.errors.network);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, t],
  );

  // While waiting for approval, check every 5 seconds.
  useEffect(() => {
    if (stage !== "pending" || !address || error) return;
    const i = setInterval(async () => {
      const st = await fetch(`/api/applicants?address=${address}`).then((r) => r.json()).catch(() => null);
      if (st?.status === "approved") void continueSetup(address);
    }, 5000);
    return () => clearInterval(i);
  }, [stage, address, error, continueSetup]);

  // Default share count: as many as the test money buys, up to 5.
  const price = stats.data?.pricePerShareUsdc ?? 5_000_000n;
  const remaining = stats.data ? stats.data.maxShares - stats.data.sharesSold : 3500n;
  const affordable = holding ? holding.usdc / price : 0n;
  const max = Number(affordable < remaining ? affordable : remaining);
  useEffect(() => {
    if (stage === "buy" && max > 0) setCount((c) => Math.min(Math.max(1, c === 1 ? Math.min(max, 5) : c), max));
  }, [stage, max]);

  async function submitId() {
    setError(null);
    if (!name.trim()) return setError(t.app.join.nameInvalid);
    if (!idPhoto || !selfie) return setError(t.app.join.photosNeeded);
    if (!consent) return setError(t.app.join.consentNeeded);
    setStage("setup");
    const who = create({ name: name.trim(), phone, startedAt: startedAt ?? Date.now() });
    try {
      const res = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: who, name: name.trim(), phoneLast4: phone.replace(/\D/g, "").slice(-4) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && body.status !== "pending") {
        setStage("pending");
        setError(msg(body.error ?? "network"));
        return;
      }
      await continueSetup(who);
    } catch {
      setStage("pending");
      setError(t.app.errors.network);
    }
  }

  async function buy() {
    if (!keyHex) return;
    setError(null);
    setStage("buying");
    try {
      const { hashes } = await buyShares(keyHex, BigInt(count), setBuyStep);
      const h = await refresh();
      refreshChain();
      setResult({ shares: h?.shares ?? BigInt(count), hashes, tookMs: Date.now() - (startedAt ?? Date.now()) });
      setStage("done");
    } catch (e) {
      setError(msg(errorCode(e)));
      setStage("buy");
    } finally {
      setBuyStep(null);
    }
  }

  function startOver() {
    if (!window.confirm(t.app.join.resetConfirm)) return;
    reset();
    setStage("phone");
    setPhone("");
    setCode("");
    setSentCode(null);
    setName("");
    setIdPhoto(false);
    setSelfie(false);
    setConsent(false);
    setResult(null);
    setError(null);
    setStartedAt(Date.now());
  }

  const elapsed = startedAt ? clock((result ? startedAt + result.tookMs : now) - startedAt) : "0:00";
  const soldOut = remaining <= 0n;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.app.join.title}</h1>
          <p className="text-xs text-zinc-300 tabular-nums bg-d-active border border-d-line-2 rounded px-2 py-1" aria-live="off">
            {t.app.join.elapsed(elapsed)}
          </p>
        </div>
        <p className="text-sm text-zinc-400">{t.app.join.intro}</p>
        <Steps stage={stage} />
      </header>

      {!ready ? (
        <LoaderCircle className="w-5 h-5 animate-spin text-zinc-400" aria-label={t.meter.checking} />
      ) : stage === "phone" ? (
        <Panel title={t.app.join.phoneTitle} id="phone-step">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (!sentCode) {
                if (!validPhone(phone)) return setError(t.app.join.phoneInvalid);
                setSentCode(String(Math.floor(100000 + Math.random() * 900000)));
                return;
              }
              if (code.trim() !== sentCode) return setError(t.app.join.codeWrong);
              setStage("id");
            }}
          >
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
                {t.app.join.phoneLabel}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-describedby="phone-hint"
                disabled={Boolean(sentCode)}
                className={inputCls}
                placeholder="082 123 4567"
              />
              <p id="phone-hint" className="text-xs text-zinc-400 mt-1.5">
                {t.app.join.phoneHint}
              </p>
            </div>
            {sentCode && (
              <div>
                <p className="mb-3 rounded-md border border-amber-700 bg-amber-950/50 px-3 py-2 text-sm text-amber-200">{t.app.join.demoCode(sentCode)}</p>
                <label htmlFor="code" className="block text-sm font-medium mb-1.5">
                  {t.app.join.codeLabel}
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputCls} tracking-[0.4em] font-mono`}
                  autoFocus
                />
              </div>
            )}
            {error && <ErrorBox text={error} />}
            <button type="submit" className={primaryBtn}>
              {sentCode ? t.app.join.next : t.app.join.sendCode}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </Panel>
      ) : stage === "id" ? (
        <Panel title={t.app.join.idTitle} id="id-step">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submitId();
            }}
          >
            <p className="rounded-md border border-amber-700 bg-amber-950/50 px-3 py-2 text-sm text-amber-200">{t.app.join.mockNote}</p>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                {t.app.join.nameLabel}
              </label>
              <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "idphoto", label: t.app.join.idDoc, icon: IdCard, done: idPhoto, set: setIdPhoto, capture: "environment" as const },
                { id: "selfie", label: t.app.join.selfie, icon: Camera, done: selfie, set: setSelfie, capture: "user" as const },
              ].map((f) => (
                <label
                  key={f.id}
                  htmlFor={f.id}
                  className={`flex items-center gap-3 rounded-md border px-3 min-h-14 cursor-pointer focus-within:outline focus-within:outline-2 ${
                    f.done ? "border-emerald-700 bg-emerald-950/40" : "border-d-line-2 bg-d-input hover:border-zinc-500"
                  }`}
                >
                  {f.done ? <CircleCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" /> : <f.icon className="w-5 h-5 text-zinc-400" aria-hidden="true" />}
                  <span className="text-sm">
                    <span className="block font-medium">{f.label}</span>
                    <span className="block text-xs text-zinc-400">{f.done ? t.app.join.chosen : t.app.join.choose}</span>
                  </span>
                  {/* The photo never leaves the phone: we only note that one was picked. */}
                  <input
                    id={f.id}
                    type="file"
                    accept="image/*"
                    capture={f.capture}
                    className="sr-only"
                    onChange={(e) => f.set(Boolean(e.target.files?.length))}
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => {
                setIdPhoto(true);
                setSelfie(true);
              }}
            >
              {t.app.join.samples}
            </button>
            <label className="flex items-start gap-3 text-sm min-h-11 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 accent-white" />
              {t.app.join.consent}
            </label>
            {error && <ErrorBox text={error} />}
            <button type="submit" className={primaryBtn}>
              {t.app.join.submit}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </Panel>
      ) : stage === "setup" || stage === "pending" ? (
        <Panel>
          <div role="status" aria-live="polite" className="space-y-4">
            {error ? (
              <ErrorBox text={error} onRetry={address ? () => void continueSetup(address) : undefined} />
            ) : stage === "pending" ? (
              <p className="flex items-start gap-3 text-sm text-zinc-200">
                <LoaderCircle className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
                {t.app.join.pending}
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <CircleCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" /> {t.app.join.checking}
                </li>
                <li className="flex items-center gap-3 text-zinc-200">
                  <LoaderCircle className="w-5 h-5 animate-spin" aria-hidden="true" /> {t.app.join.settingUp}
                </li>
              </ul>
            )}
          </div>
        </Panel>
      ) : stage === "buy" || stage === "buying" ? (
        <Panel title={t.app.join.buyTitle} id="buy-step">
          <div className="space-y-5">
            <p className="flex items-center gap-2 text-sm text-emerald-300">
              <CircleCheck className="w-4 h-4" aria-hidden="true" /> {t.app.join.approved}
            </p>
            {soldOut ? (
              <ErrorBox text={t.app.join.soldOut} />
            ) : stats.data?.salePaused ? (
              <ErrorBox text={t.app.join.salePaused} />
            ) : max < 1 ? (
              <ErrorBox text={t.app.join.noMoney} onRetry={address ? () => void continueSetup(address) : undefined} />
            ) : (
              <>
                <div>
                  <label htmlFor="count" className="block text-sm font-medium mb-1.5">
                    {t.app.join.sharesLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="−1" className={secondaryBtn} onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={stage === "buying"}>
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <input
                      id="count"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={max}
                      value={count}
                      disabled={stage === "buying"}
                      onChange={(e) => setCount(Math.max(1, Math.min(max, Math.round(Number(e.target.value)) || 1)))}
                      aria-describedby="count-hint"
                      className={`${inputCls} w-24 text-center text-xl font-semibold tabular-nums`}
                    />
                    <button type="button" aria-label="+1" className={secondaryBtn} onClick={() => setCount((c) => Math.min(max, c + 1))} disabled={stage === "buying"}>
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p id="count-hint" className="text-xs text-zinc-400 mt-1.5">
                    {t.app.join.upTo(int(max))}
                  </p>
                </div>

                <dl className="rounded-md border border-d-line-2 divide-y divide-d-line-2">
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-sm text-zinc-300">{t.app.join.youPay}</dt>
                    <dd className="text-right">
                      <span className="block text-2xl font-semibold tabular-nums">{rand(usdcToRand(price * BigInt(count)), 2)}</span>
                      <span className="block text-xs text-zinc-400">{t.app.join.inUsdc(usdcToNumber(price * BigInt(count)).toFixed(2))}</span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <dt className="text-zinc-300">{t.app.join.balance}</dt>
                    <dd className="tabular-nums">{holding ? rand(usdcToRand(holding.usdc), 2) : "…"}</dd>
                  </div>
                </dl>

                {error && <ErrorBox text={error} />}

                <button type="button" onClick={buy} disabled={stage === "buying"} className={`${primaryBtn} w-full sm:w-auto text-base`}>
                  {stage === "buying" ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                  {stage === "buying"
                    ? buyStep === "approve"
                      ? t.app.join.stepApprove
                      : t.app.join.stepBuy
                    : t.app.join.confirm(String(count))}
                </button>
                <p className="text-xs text-zinc-400">{t.app.join.testMoney}</p>
              </>
            )}
          </div>
        </Panel>
      ) : result ? (
        <Panel>
          <div role="status" className="space-y-4">
            <CircleCheck className="w-10 h-10 text-emerald-400" aria-hidden="true" />
            <h2 className="text-2xl font-semibold">{t.app.join.doneTitle(int(result.shares))}</h2>
            <p className="text-zinc-300">{t.app.join.doneBody}</p>
            <p className="text-sm text-emerald-300 font-medium">{t.app.join.doneTime(clock(result.tookMs))}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/solar/me" className={primaryBtn}>
                {t.app.join.seeShares}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <ExternalA href={txUrl(result.hashes[result.hashes.length - 1])} className={secondaryBtn}>
                {t.app.join.receipt}
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </ExternalA>
              <button type="button" className={secondaryBtn} onClick={() => setStage("buy")}>
                {t.app.join.buyMore}
              </button>
            </div>
            <p className="text-xs text-zinc-400">{t.app.join.testMoney}</p>
          </div>
        </Panel>
      ) : null}

      {address && stage !== "phone" && (
        <button type="button" onClick={startOver} className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white underline underline-offset-4 min-h-11">
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          {t.app.join.reset}
        </button>
      )}
    </div>
  );
}
