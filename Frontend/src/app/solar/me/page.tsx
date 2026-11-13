"use client";

// My shares (#22): what I own, payouts, claim, mocked cash-out, history.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Banknote, CircleCheck, Info, LoaderCircle, Receipt, X } from "lucide-react";
import { useAccount } from "@/components/chain/Account";
import { useChainData } from "@/components/chain/ChainData";
import { ExternalA, inputCls, KV, Panel, primaryBtn, secondaryBtn } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { claimPayout } from "@/lib/account";
import { ClaimBlocker, distributor, errorCode, readEvents, sale, shortHex, txUrl, addressUrl, ZAR_PER_USD } from "@/lib/chain";
import { int, rand, usdcToRand } from "@/lib/format";

type HistoryItem = { kind: "bought" | "claimed" | "income"; amount: bigint; shares?: bigint; txHash: string; block: bigint };

function useHistory(address: string | null, bump: unknown) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [paid, setPaid] = useState<bigint | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!address) return;
    let live = true;
    Promise.all([
      readEvents<{ amount: bigint; cost: bigint }>(sale, "SharesPurchased", { limit: 20, args: { buyer: address } }),
      readEvents<{ amount: bigint }>(distributor, "PayoutClaimed", { limit: 20, args: { account: address } }),
      readEvents<{ amount: bigint }>(distributor, "IncomeDeposited", { limit: 6 }),
    ]).then(
      ([bought, claimed, income]) => {
        if (!live) return;
        const list: HistoryItem[] = [
          ...bought.map((l) => ({ kind: "bought" as const, amount: l.args.cost, shares: l.args.amount, txHash: l.txHash, block: l.blockNumber })),
          ...claimed.map((l) => ({ kind: "claimed" as const, amount: l.args.amount, txHash: l.txHash, block: l.blockNumber })),
          ...income.map((l) => ({ kind: "income" as const, amount: l.args.amount, txHash: l.txHash, block: l.blockNumber })),
        ].sort((a, b) => (b.block > a.block ? 1 : -1));
        setItems(list);
        setPaid(bought.reduce((s, l) => s + l.args.cost, 0n));
        setError(false);
      },
      () => live && setError(true),
    );
    return () => {
      live = false;
    };
  }, [address, bump]);
  return { items, paid, error };
}

interface CashReceipt {
  ref: string;
  provider: string;
  number: string;
  amountRand: number;
  at: Date;
}

function ReceiptDialog({ receipt, onClose }: { receipt: CashReceipt | null; onClose: () => void }) {
  const { t, lang } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (receipt && !d.open) d.showModal();
    if (!receipt && d.open) d.close();
  }, [receipt]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="receipt-title"
      className="m-auto w-[min(92vw,26rem)] rounded-lg bg-d-panel text-d-text border border-d-line-2 p-0 backdrop:bg-black/70"
    >
      {receipt && (
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id="receipt-title" className="flex items-center gap-2 text-lg font-semibold">
              <Receipt className="w-5 h-5" aria-hidden="true" />
              {t.app.me.receiptTitle}
            </h2>
            <button type="button" onClick={onClose} aria-label={t.app.me.close} className="w-11 h-11 -m-2 inline-flex items-center justify-center text-zinc-300 hover:text-white">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-center text-xs font-bold tracking-widest text-amber-300 border border-amber-700 rounded py-1.5">{t.app.me.receiptDemo}</p>
          <dl>
            <KV k={t.app.me.ref} v={<code className="font-mono">{receipt.ref}</code>} />
            <KV k={t.app.me.to} v={receipt.number} />
            <KV k={t.app.me.via} v={receipt.provider} />
            <KV k={t.app.me.sent} v={rand(receipt.amountRand, 2)} />
            <KV k={t.app.me.fee} v={t.app.me.feeValue} />
            <KV k={t.app.me.when} v={receipt.at.toLocaleString(lang === "zu" ? "zu-ZA" : "en-ZA")} />
          </dl>
          <p className="text-xs text-zinc-400">{t.app.me.cashMock}</p>
          <button type="button" onClick={onClose} className={`${primaryBtn} w-full`}>
            {t.app.me.close}
          </button>
        </div>
      )}
    </dialog>
  );
}

export default function MePage() {
  const { t } = useLang();
  const { ready, keyHex, address, profile, holding, refresh } = useAccount();
  const { stats, refresh: refreshChain } = useChainData();
  const [bump, setBump] = useState(0);
  const { items, paid, error: historyError } = useHistory(address, bump);

  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [provider, setProvider] = useState("Kotani Pay");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [cashError, setCashError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CashReceipt | null>(null);

  useEffect(() => {
    if (profile?.phone && !number) setNumber(profile.phone);
  }, [profile, number]);

  const onClaim = useCallback(async () => {
    if (!keyHex || !holding) return;
    setClaiming(true);
    setClaimMsg(null);
    const amt = holding.pendingPayout;
    try {
      await claimPayout(keyHex);
      setClaimMsg({ ok: true, text: t.app.me.claimed(rand(usdcToRand(amt), 2)) });
      await refresh();
      refreshChain();
      setBump((b) => b + 1);
    } catch (e) {
      const code = errorCode(e);
      setClaimMsg({ ok: false, text: t.app.errors[code] ?? t.app.errors.network });
    } finally {
      setClaiming(false);
    }
  }, [keyHex, holding, refresh, refreshChain, t]);

  if (!ready) return <div className="p-8"><LoaderCircle className="w-5 h-5 animate-spin text-zinc-400" aria-label={t.meter.checking} /></div>;

  if (!address) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.app.me.title}</h1>
        <Panel>
          <p className="text-zinc-200">{t.app.me.empty}</p>
          <Link href="/solar/join" className={`${primaryBtn} mt-4`}>
            {t.app.me.start}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </Panel>
      </div>
    );
  }

  const h = holding;
  const total = stats.data?.sharesSold ?? 0n;
  const share = h && total > 0n ? `${((Number(h.shares) / Number(total)) * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%` : "0%";
  const blocker = h?.claimBlocker ?? ClaimBlocker.NOTHING_TO_CLAIM;
  const cashRand = h ? usdcToRand(h.usdc) : 0;

  const tiles = [
    { k: t.app.me.owned, v: h ? int(h.shares) : "…", sub: h ? t.app.me.ofGrid(share) : undefined },
    { k: t.app.me.paid, v: paid !== null ? rand(usdcToRand(paid), 2) : "…" },
    { k: t.app.me.payoutsSoFar, v: h ? rand(usdcToRand(h.totalClaimed), 2) : "…" },
    { k: t.app.me.claimable, v: h ? rand(usdcToRand(h.pendingPayout), 2) : "…" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.app.me.title}</h1>
        {profile && <p className="text-sm text-zinc-400 mt-1">{profile.name}</p>}
      </header>

      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((x) => (
          <li key={x.k} className="bg-d-panel border border-d-line rounded-lg p-4">
            <p className="text-xs text-zinc-400">{x.k}</p>
            <p className="mt-2 text-xl sm:text-2xl font-semibold tabular-nums">{x.v}</p>
            {x.sub && <p className="text-xs text-zinc-400 mt-1">{x.sub}</p>}
          </li>
        ))}
      </ul>

      {h && h.shares === 0n && (
        <Link href="/solar/join" className={primaryBtn}>
          {t.app.me.start}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claim */}
        <Panel title={t.app.me.claim} id="claim">
          <dl className="mb-4">
            <KV k={t.app.me.claimable} v={h ? rand(usdcToRand(h.pendingPayout), 2) : "…"} />
            <KV k={t.app.me.nextIncome} v={t.app.me.nextIncomeValue} />
          </dl>
          {blocker !== ClaimBlocker.NONE && (
            <p className={`flex items-start gap-2 text-sm mb-4 rounded-md border p-3 ${blocker === ClaimBlocker.METER_NOT_OK ? "border-red-800 bg-red-950/50 text-red-200" : "border-d-line-2 text-zinc-300"}`}>
              <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              {t.app.me.blockers[blocker]}
            </p>
          )}
          <button type="button" onClick={onClaim} disabled={claiming || blocker !== ClaimBlocker.NONE} className={primaryBtn}>
            {claiming && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {claiming ? t.app.me.claiming : t.app.me.claim}
          </button>
          <p aria-live="polite" className={`mt-3 text-sm ${claimMsg?.ok ? "text-emerald-300" : "text-red-300"}`}>
            {claimMsg && (
              <span className="inline-flex items-center gap-2">
                {claimMsg.ok && <CircleCheck className="w-4 h-4" aria-hidden="true" />}
                {claimMsg.text}
              </span>
            )}
          </p>
        </Panel>

        {/* Cash out (mocked) */}
        <Panel title={t.app.me.cashTitle} id="cash">
          <p className="mb-4 rounded-md border border-amber-700 bg-amber-950/50 px-3 py-2 text-sm text-amber-200">{t.app.me.cashMock}</p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setCashError(null);
              const r = Number(amount.replace(",", "."));
              if (cashRand <= 0) return setCashError(t.app.me.nothingToCash);
              if (!(r > 0) || r > cashRand + 0.005) return setCashError(t.app.me.amountInvalid);
              setReceipt({
                ref: `SS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                provider,
                number: number.trim() || "—",
                amountRand: r,
                at: new Date(),
              });
            }}
          >
            <div>
              <label htmlFor="provider" className="block text-sm font-medium mb-1.5">
                {t.app.me.provider}
              </label>
              <select id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}>
                <option>Kotani Pay</option>
                <option>Yellow Card</option>
              </select>
            </div>
            <div>
              <label htmlFor="mm-number" className="block text-sm font-medium mb-1.5">
                {t.app.me.number}
              </label>
              <input id="mm-number" type="tel" autoComplete="tel" value={number} onChange={(e) => setNumber(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mm-amount" className="block text-sm font-medium mb-1.5">
                {t.app.me.amount}
              </label>
              <input
                id="mm-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby="mm-available"
                className={inputCls}
                placeholder="0.00"
              />
              <p id="mm-available" className="text-xs text-zinc-400 mt-1.5">
                {t.app.me.available(rand(cashRand, 2))} · R{ZAR_PER_USD.toFixed(2)} = 1 USDC
              </p>
            </div>
            {cashError && (
              <p role="alert" className="text-sm text-red-300">
                {cashError}
              </p>
            )}
            <button type="submit" className={secondaryBtn}>
              <Banknote className="w-4 h-4" aria-hidden="true" />
              {t.app.me.cashOut}
            </button>
          </form>
        </Panel>
      </div>

      {/* History */}
      <Panel title={t.app.me.history} id="history">
        {historyError ? (
          <p className="text-sm text-zinc-400">{t.app.errors.network}</p>
        ) : !items ? (
          <p className="text-sm text-zinc-400">{t.app.me.hLoading}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-400">{t.app.me.hEmpty}</p>
        ) : (
          <ul className="divide-y divide-d-line">
            {items.map((it) => (
              <li key={`${it.kind}-${it.txHash}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <span className="text-zinc-100">
                  {it.kind === "bought" ? t.app.me.hBought(int(it.shares ?? 0n)) : it.kind === "claimed" ? t.app.me.hClaimed : t.app.me.hIncome}
                </span>
                <span className="flex items-center gap-4">
                  <span className={`tabular-nums ${it.kind === "claimed" ? "text-emerald-300" : "text-zinc-200"}`}>
                    {it.kind === "bought" ? "−" : it.kind === "claimed" ? "+" : ""}
                    {rand(usdcToRand(it.amount), 2)}
                  </span>
                  <ExternalA
                    href={txUrl(it.txHash)}
                    label={`${t.trust.view} (Basescan)`}
                    className="inline-flex items-center gap-0.5 min-h-11 sm:min-h-0 text-zinc-100 underline underline-offset-4 decoration-zinc-500"
                  >
                    {t.trust.view}
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </ExternalA>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t.app.me.accountTitle} id="account">
        <dl>
          <KV
            k={t.app.me.refNumber}
            v={
              <ExternalA href={addressUrl(address).replace("#code", "")} className="font-mono underline underline-offset-4 decoration-zinc-500">
                {shortHex(address, 6)}
              </ExternalA>
            }
          />
        </dl>
        <p className="text-xs text-zinc-400 mt-2">{t.app.me.accountNote}</p>
      </Panel>

      <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
