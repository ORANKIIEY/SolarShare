"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, House, LayoutGrid, Settings2, ShoppingBag, Wallet2 } from "lucide-react";
import { AccountProvider, useAccount } from "@/components/chain/Account";
import { ChainDataProvider, useChainData } from "@/components/chain/ChainData";
import { LiveFeedProvider } from "@/components/chain/LiveFeed";
import { LogoMark } from "@/components/landing/Nav";
import { DARK_PILL, KV } from "@/components/ui";
import { LanguageToggle, useLang } from "@/i18n/LanguageProvider";
import { MeterStatus } from "@/lib/chain";
import { int, kw, pct, rand, usdcToRand } from "@/lib/format";
import LiveBanner from "./LiveBanner";

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

function useNav() {
  const { t } = useLang();
  return [
    { href: "/solar", label: t.app.nav.grid, icon: LayoutGrid, exact: true },
    { href: "/solar/join", label: t.app.nav.join, icon: ShoppingBag },
    { href: "/solar/me", label: t.app.nav.me, icon: Wallet2 },
    { href: "/solar/live", label: t.app.nav.live, icon: Activity },
  ];
}

function isActive(path: string, href: string, exact?: boolean) {
  return exact ? path === href : under(path, href);
}

/** Thin far-left rail: logo, home, operator. */
function Rail() {
  const { t } = useLang();
  const path = usePathname();
  const op = under(path, "/solar/operator");
  return (
    <div className="hidden lg:flex w-[72px] shrink-0 flex-col items-center py-4 gap-4 border-r border-d-line bg-d-side">
      <Link href="/" aria-label={t.app.nav.home} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <LogoMark className="w-6 h-6" />
      </Link>
      <Link
        href="/"
        aria-label={t.app.nav.home}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 border border-dashed border-zinc-700"
      >
        <House className="w-5 h-5" aria-hidden="true" />
      </Link>
      <div className="mt-auto relative">
        {op && <span aria-hidden="true" className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-md" />}
        <Link
          href="/solar/operator"
          aria-label={t.app.nav.operator}
          aria-current={op ? "page" : undefined}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${op ? "bg-zinc-800 text-white border-zinc-600" : "text-zinc-400 border-zinc-800 hover:text-white"}`}
        >
          <Settings2 className="w-5 h-5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function Sidebar() {
  const { t } = useLang();
  const path = usePathname();
  const nav = useNav();
  const { profile } = useAccount();
  return (
    <nav aria-label="Platform" className="hidden lg:flex w-[240px] shrink-0 flex-col bg-d-side border-r border-d-line">
      <div className="h-14 flex items-center px-4 border-b border-d-line">
        <span className="font-semibold text-[15px] tracking-tight">SolarShare</span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold uppercase tracking-wider">Test</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        <div>
          <p className="px-5 mb-2 text-xs font-medium text-zinc-400">Soweto Block A</p>
          <ul className="space-y-0.5">
            {nav.map((n) => {
              const on = isActive(path, n.href, n.exact);
              const Icon = n.icon;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-center gap-2.5 px-3 min-h-10 mx-2 rounded-md text-[13px] transition-colors ${
                      on ? "bg-d-active text-white font-medium" : "text-zinc-300 hover:bg-d-hover hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        {profile && (
          <div className="px-5">
            <p className="text-xs font-medium text-zinc-400 mb-1">{t.app.me.accountTitle}</p>
            <p className="text-[13px] text-zinc-200 truncate">{profile.name}</p>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-d-line">
        <LanguageToggle dark />
      </div>
    </nav>
  );
}

/** Right-hand "at a glance" panel (wide screens). */
function InfoPanel() {
  const { t } = useLang();
  const { meter, stats, readings } = useChainData();
  const { holding, address } = useAccount();
  const m = meter.data;
  const s = stats.data;
  const held = s ? s.totalDeposited - s.totalClaimed : undefined;
  return (
    <aside aria-label={t.app.panel.title} className="hidden xl:flex w-[300px] shrink-0 flex-col bg-d-panel border-l border-d-line">
      <div className="h-14 flex items-center px-5 border-b border-d-line text-[13px] font-medium">{t.app.panel.title}</div>
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        <dl>
          <KV
            k={t.app.panel.status}
            v={
              m ? (
                <span className={`inline-flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded border ${DARK_PILL[m.status as MeterStatus]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                  {t.meter.status[m.status]}
                </span>
              ) : (
                "…"
              )
            }
          />
          <KV k={t.app.panel.powerNow} v={m ? kw(m.lastPowerW) : "…"} />
          <KV k={t.app.panel.sharesSold} v={s ? `${int(s.sharesSold)} / ${int(s.maxShares)}` : "…"} />
          <KV k={t.app.panel.price} v={s ? rand(usdcToRand(s.pricePerShareUsdc), 2) : "…"} />
          <KV k={t.app.panel.held} v={held !== undefined ? rand(usdcToRand(held), 2) : "…"} />
          <KV k={t.app.panel.yourShares} v={address ? (holding ? int(holding.shares) : "…") : t.app.panel.notJoined} />
        </dl>

        <div>
          <h3 className="text-[13px] font-medium text-white mb-3">{t.app.panel.activity}</h3>
          {readings.data && readings.data.length > 0 ? (
            <ul className="flex items-end gap-[4px] h-10" aria-label={t.app.panel.activity}>
              {[...readings.data].reverse().map((r) => {
                const bad = m ? r.gapBps > m.theftGapBps : r.gapBps > 1500;
                return (
                  <li
                    key={r.seq.toString()}
                    title={`${pct(r.gapBps)}`}
                    className={`flex-1 rounded-sm ${bad ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ height: `${Math.max(20, 100 - r.gapBps / 100)}%` }}
                  >
                    <span className="sr-only">
                      {t.meter.lastGap}: {pct(r.gapBps)}
                      {bad ? ` (${t.meter.status[1]})` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-zinc-400">{readings.error ? t.trust.readingsError : t.trust.loadingReadings}</p>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">{t.testnetShort}</p>
      </div>
    </aside>
  );
}

/** Phone: top bar and bottom tab bar. */
function MobileTop() {
  const { t } = useLang();
  return (
    <div className="lg:hidden flex items-center justify-between gap-3 h-14 px-4 border-b border-d-line bg-d-side">
      <Link href="/" className="flex items-center gap-2 text-white">
        <LogoMark className="w-6 h-6" />
        <span className="font-semibold text-[15px]">SolarShare</span>
        <span className="sr-only">({t.app.nav.home})</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold uppercase tracking-wider">Test</span>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageToggle dark compact />
      </div>
    </div>
  );
}

function BottomNav() {
  const path = usePathname();
  const nav = useNav();
  return (
    <nav aria-label="Platform" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-d-side/95 backdrop-blur border-t border-d-line pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {nav.map((n) => {
          const on = isActive(path, n.href, n.exact);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-14 px-1 text-[11px] font-medium ${on ? "text-white" : "text-zinc-400"}`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-center leading-tight">{n.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const path = usePathname();
  const bigBannerPage = path === "/solar/live";
  return (
    <div className="platform min-h-screen lg:h-screen lg:flex lg:overflow-hidden">
      <a
        href="#platform-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-black focus:px-4 focus:py-3 focus:text-sm focus:font-semibold"
      >
        {t.skip}
      </a>
      <Rail />
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">
        <MobileTop />
        {!bigBannerPage && <LiveBanner />}
        <main id="platform-main" className="flex-1 lg:overflow-y-auto pb-24 lg:pb-10">
          {children}
        </main>
      </div>
      <InfoPanel />
      <BottomNav />
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ChainDataProvider meterPollMs={2_000}>
      <LiveFeedProvider>
        <AccountProvider>
          <Frame>{children}</Frame>
        </AccountProvider>
      </LiveFeedProvider>
    </ChainDataProvider>
  );
}
