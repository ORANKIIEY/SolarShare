"use client";

// Operator page (#23): approve investors, pay in income, freeze/recover
// accounts and manage the meter. Every action is signed on the server with the
// operator key (see src/lib/server/operator.ts); the browser never sees it.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, LoaderCircle, LogOut, RefreshCw, ShieldCheck, X } from "lucide-react";
import { formatEther, formatUnits } from "viem";
import { useChainData } from "@/components/chain/ChainData";
import Readings from "@/components/platform/Readings";
import { DARK_PILL, ExternalA, inputCls, KV, Panel, primaryBtn, secondaryBtn } from "@/components/ui";
import { MeterStatus, addressUrl, shortHex, txUrl } from "@/lib/chain";
import { dateTime, rand, usdcToNumber, usdcToRand } from "@/lib/format";

interface Applicant {
  address: string;
  name: string;
  phoneLast4: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  txHash?: string;
}

interface Overview {
  applicants: Applicant[];
  balances: { address: string; eth: string; usdc: string } | null;
  sponsor: {
    sponsor: string;
    balance: { eth: string; usdc: string };
    given: { eth: string; usdc: string };
  } | null;
}

type Result = { ok: boolean; text: string; tx?: string[] } | null;

const OPERATOR_ERRORS: Record<string, string> = {
  NoSharesIssued: "No shares have been sold yet, so there is nobody to pay. Nothing was sent.",
  DepositExceedsAttestedEnergy: "That is more than the meter has proven was sold. Nothing was sent.",
  NotEnoughMoney: "The operator account doesn't have enough test USDC or ETH.",
  Unauthorized: "The operator key doesn't have the role for this action.",
  AccountNotApproved: "That account isn't approved yet. Approve it first.",
  AccountFrozen: "That account is frozen.",
  config: "Server settings are missing (Frontend/.env.local).",
  BAD_REQUEST: "Check the address or amount.",
  network: "Network problem. Try again.",
};

function ResultLine({ r }: { r: Result }) {
  if (!r) return null;
  return (
    <div role={r.ok ? "status" : "alert"} className={`mt-3 text-sm ${r.ok ? "text-emerald-300" : "text-red-300"}`}>
      <p>{r.text}</p>
      {r.tx?.map((h) => (
        <ExternalA key={h} href={txUrl(h)} className="inline-flex items-center gap-1 mr-3 text-xs underline underline-offset-4 text-zinc-200">
          {shortHex(h, 6)} <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        </ExternalA>
      ))}
    </div>
  );
}

const STATUS_PILL: Record<Applicant["status"], string> = {
  pending: "bg-amber-950/70 text-amber-300 border-amber-800",
  approved: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
  rejected: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

export default function OperatorPage() {
  const router = useRouter();
  const { meter, stats, refresh: refreshChain } = useChainData();
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});

  const [manual, setManual] = useState("");
  const [depositAmt, setDepositAmt] = useState("");
  const [acct, setAcct] = useState("");
  const [lost, setLost] = useState("");
  const [newAddr, setNewAddr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/operator", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return router.replace("/solar/operator/login");
    if (!res?.ok) return setLoadError(true);
    setData(await res.json());
    setLoadError(false);
  }, [router]);

  useEffect(() => {
    void load();
    const i = setInterval(() => document.visibilityState === "visible" && load(), 10_000);
    return () => clearInterval(i);
  }, [load]);

  async function act(key: string, body: Record<string, unknown>, okText: string) {
    setBusy(key);
    setResults((r) => ({ ...r, [key]: null }));
    const res = await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (res?.status === 401) return router.replace("/solar/operator/login");
    setResults((r) => ({
      ...r,
      [key]: json.ok
        ? { ok: true, text: okText, tx: json.txHashes }
        : { ok: false, text: OPERATOR_ERRORS[json.code ?? json.error] ?? `${json.code ?? json.error ?? "Error"}: ${json.message ?? "try again"}` },
    }));
    void load();
    refreshChain();
  }

  async function signOut() {
    await fetch("/api/operator/login", { method: "DELETE" });
    router.replace("/solar/operator/login");
  }

  const m = meter.data;
  const s = stats.data;
  const pending = data?.applicants.filter((a) => a.status === "pending") ?? [];
  const others = data?.applicants.filter((a) => a.status !== "pending") ?? [];
  const maxDeposit = s && data?.balances ? (s.remainingDepositAllowance < BigInt(data.balances.usdc) ? s.remainingDepositAllowance : BigInt(data.balances.usdc)) : undefined;

  const spin = (k: string) => (busy === k ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Operator</h1>
          <p className="text-sm text-zinc-400 mt-1">Soweto Block A · actions are signed on the server with the operator&apos;s test key</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className={secondaryBtn}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
          </button>
          <button type="button" onClick={signOut} className={secondaryBtn}>
            <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </header>
      {loadError && <p role="alert" className="text-sm text-red-300">Couldn&apos;t load operator data. Is the server running with Frontend/.env.local?</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Operator account" id="op-account">
          <dl>
            <KV k="Address" v={data?.balances ? <ExternalA href={addressUrl(data.balances.address)} className="font-mono underline underline-offset-4">{shortHex(data.balances.address, 6)}</ExternalA> : "…"} />
            <KV k="Test ETH (fees)" v={data?.balances ? Number(formatEther(BigInt(data.balances.eth))).toFixed(5) : "…"} />
            <KV k="Test USDC" v={data?.balances ? formatUnits(BigInt(data.balances.usdc), 6) : "…"} />
          </dl>
        </Panel>
        <Panel title="Sponsor (pays new investors' fees)" id="op-sponsor">
          {data?.sponsor ? (
            <dl>
              <KV k="Address" v={<ExternalA href={addressUrl(data.sponsor.sponsor)} className="font-mono underline underline-offset-4">{shortHex(data.sponsor.sponsor, 6)}</ExternalA>} />
              <KV k="Balance" v={`${Number(data.sponsor.balance.eth).toFixed(5)} ETH · ${data.sponsor.balance.usdc} USDC`} />
              <KV k="Given so far" v={`${data.sponsor.given.eth} ETH · ${data.sponsor.given.usdc} USDC`} />
            </dl>
          ) : (
            <p className="text-sm text-amber-300">
              Sponsor service not reachable. Start it with <code className="font-mono">npm run sponsor</code> in Blockchain/.
            </p>
          )}
        </Panel>
      </div>

      {/* Investors */}
      <Panel title={`Investors waiting for approval (${pending.length})`} id="op-investors">
        {!data ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-zinc-400">Nobody is waiting. (With DEMO_AUTO_APPROVE=1, new investors are approved straight after the mocked ID check.)</p>
        ) : (
          <ul className="divide-y divide-d-line">
            {pending.map((a) => (
              <li key={a.address} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-medium text-white">{a.name}</p>
                  <p className="text-xs text-zinc-400">
                    <span className="font-mono">{shortHex(a.address, 6)}</span> · phone ends {a.phoneLast4} · {dateTime(new Date(a.createdAt))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={primaryBtn} disabled={busy !== null} onClick={() => act(`a-${a.address}`, { action: "approve", address: a.address }, `Approved ${a.name}.`)}>
                    {spin(`a-${a.address}`) ?? <Check className="w-4 h-4" aria-hidden="true" />} Approve
                  </button>
                  <button type="button" className={secondaryBtn} disabled={busy !== null} onClick={() => act(`a-${a.address}`, { action: "reject", address: a.address }, `Rejected ${a.name}.`)}>
                    <X className="w-4 h-4" aria-hidden="true" /> Reject
                  </button>
                </div>
                <div className="w-full">
                  <ResultLine r={results[`a-${a.address}`] ?? null} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {others.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-zinc-300 min-h-11 flex items-center">Approved and rejected ({others.length})</summary>
            <ul className="divide-y divide-d-line">
              {others.map((a) => (
                <li key={a.address} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {a.name} <span className="font-mono text-xs text-zinc-400">{shortHex(a.address, 6)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded border ${STATUS_PILL[a.status]}`}>{a.status}</span>
                    {a.txHash && (
                      <ExternalA href={txUrl(a.txHash)} className="text-xs underline underline-offset-4 text-zinc-300">
                        tx
                      </ExternalA>
                    )}
                    {a.status === "approved" && (
                      <button type="button" className="text-xs underline underline-offset-4 text-zinc-300 min-h-11 px-1" disabled={busy !== null} onClick={() => act(`r-${a.address}`, { action: "revoke", address: a.address }, `Revoked ${a.name}.`)}>
                        Revoke
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("manual", { action: "approve", address: manual.trim() }, "Approved.");
          }}
        >
          <div className="flex-1 min-w-[16rem]">
            <label htmlFor="manual" className="block text-xs text-zinc-300 mb-1">
              Approve any account by address
            </label>
            <input id="manual" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="0x…" className={`${inputCls} font-mono`} />
          </div>
          <button type="submit" className={secondaryBtn} disabled={busy !== null || !manual}>
            {spin("manual")} Approve
          </button>
          <div className="w-full">
            <ResultLine r={results.manual ?? null} />
          </div>
        </form>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit */}
        <Panel title="Pay in this month's income" id="op-deposit">
          <dl className="mb-4">
            <KV k="Allowed by the meter (proven kWh sold × tariff)" v={s ? `${formatUnits(s.remainingDepositAllowance, 6)} USDC` : "…"} />
            <KV k="Paid in so far" v={s ? `${formatUnits(s.totalDeposited, 6)} USDC` : "…"} />
            <KV k="Most you can pay in now" v={maxDeposit !== undefined ? `${formatUnits(maxDeposit, 6)} USDC (${rand(usdcToRand(maxDeposit), 2)})` : "…"} />
          </dl>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void act("deposit", { action: "deposit", amountUsdc: depositAmt.trim() }, `Paid in ${depositAmt} USDC.`);
            }}
          >
            <div className="flex-1 min-w-[10rem]">
              <label htmlFor="dep" className="block text-xs text-zinc-300 mb-1">
                Amount (USDC)
              </label>
              <input id="dep" inputMode="decimal" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} className={inputCls} placeholder="0.05" />
            </div>
            {maxDeposit !== undefined && maxDeposit > 0n && (
              <button type="button" className={secondaryBtn} onClick={() => setDepositAmt(String(usdcToNumber(maxDeposit)))}>
                Max
              </button>
            )}
            <button type="submit" className={primaryBtn} disabled={busy !== null || !depositAmt}>
              {spin("deposit")} Pay in
            </button>
          </form>
          <p className="text-xs text-zinc-400 mt-3">The contract refuses anything above what the meter has proven was sold.</p>
          <ResultLine r={results.deposit ?? null} />
        </Panel>

        {/* Meter */}
        <Panel title="Meter" id="op-meter">
          <dl className="mb-4">
            <KV
              k="Status"
              v={
                m ? (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded border ${DARK_PILL[m.status as MeterStatus]}`}>{["OK", "THEFT", "TAMPER", "OFFLINE"][m.status]}</span>
                ) : (
                  "…"
                )
              }
            />
            <KV k="Theft line" v={m ? `more than ${m.theftGapBps / 100}% unpaid` : "…"} />
            <KV k="Offline after" v={m ? `${m.offlineTimeout} s without a reading` : "…"} />
            <KV k="Tamper flag" v={m ? (m.tamperActive ? "ON: inspect, then clear" : "off") : "…"} />
          </dl>
          <button
            type="button"
            className={secondaryBtn}
            disabled={busy !== null || !m?.tamperActive}
            onClick={() => act("tamper", { action: "clearTamper" }, "Tamper cleared.")}
          >
            {spin("tamper") ?? <ShieldCheck className="w-4 h-4" aria-hidden="true" />} Clear tamper after inspection
          </button>
          <ResultLine r={results.tamper ?? null} />
        </Panel>
      </div>

      {/* Accounts */}
      <Panel title="Investor accounts" id="op-accounts">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
            <h3 className="text-sm font-medium">Freeze or unfreeze (lost phone, investigation)</h3>
            <label htmlFor="acct" className="block text-xs text-zinc-300">
              Account address
            </label>
            <input id="acct" value={acct} onChange={(e) => setAcct(e.target.value)} placeholder="0x…" className={`${inputCls} font-mono`} />
            <div className="flex gap-2">
              <button type="button" className={secondaryBtn} disabled={busy !== null || !acct} onClick={() => act("freeze", { action: "freeze", address: acct.trim() }, "Frozen.")}>
                {busy === "freeze" && spin("freeze")} Freeze
              </button>
              <button type="button" className={secondaryBtn} disabled={busy !== null || !acct} onClick={() => act("freeze", { action: "unfreeze", address: acct.trim() }, "Unfrozen.")}>
                Unfreeze
              </button>
            </div>
            <ResultLine r={results.freeze ?? null} />
          </form>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void act("recover", { action: "recover", address: lost.trim(), newAddress: newAddr.trim() }, "Shares and unclaimed payouts moved to the new account.");
            }}
          >
            <h3 className="text-sm font-medium">Recover shares to a new account</h3>
            <label htmlFor="lost" className="block text-xs text-zinc-300">
              Lost account
            </label>
            <input id="lost" value={lost} onChange={(e) => setLost(e.target.value)} placeholder="0x…" className={`${inputCls} font-mono`} />
            <label htmlFor="newaddr" className="block text-xs text-zinc-300">
              New account (must be approved first)
            </label>
            <input id="newaddr" value={newAddr} onChange={(e) => setNewAddr(e.target.value)} placeholder="0x…" className={`${inputCls} font-mono`} />
            <button type="submit" className={secondaryBtn} disabled={busy !== null || !lost || !newAddr}>
              {spin("recover")} Recover
            </button>
            <ResultLine r={results.recover ?? null} />
          </form>
        </div>
      </Panel>

      <Panel title="Latest signed readings" id="op-readings">
        <Readings />
      </Panel>
    </div>
  );
}
