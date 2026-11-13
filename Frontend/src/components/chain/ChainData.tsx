"use client";

// One place that polls the live contracts, shared by every section on a page,
// so the hero chip, the meter panel and the share counter never disagree and
// the free test-network endpoints only get one request each.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  readAssetStats,
  readMeterState,
  readRecentReadings,
  type AssetStats,
  type MeterState,
  type Reading,
} from "@/lib/chain";

type Load<T> = { data?: T; error?: boolean; updatedAt?: number };

interface ChainData {
  meter: Load<MeterState>;
  stats: Load<AssetStats>;
  readings: Load<Reading[]>;
  refresh: () => void;
}

const Ctx = createContext<ChainData | null>(null);

const METER_POLL_MS = 6_000;
const STATS_POLL_MS = 30_000;

export function ChainDataProvider({ children, meterPollMs = METER_POLL_MS }: { children: React.ReactNode; meterPollMs?: number }) {
  const [meter, setMeter] = useState<Load<MeterState>>({});
  const [stats, setStats] = useState<Load<AssetStats>>({});
  const [readings, setReadings] = useState<Load<Reading[]>>({});
  const lastSeq = useRef<bigint | null>(null);

  const loadReadings = useCallback(async () => {
    try {
      const data = await readRecentReadings(6);
      setReadings({ data, updatedAt: Date.now() });
    } catch {
      setReadings((r) => ({ ...r, error: true }));
    }
  }, []);

  const loadMeter = useCallback(async () => {
    try {
      const data = await readMeterState();
      setMeter({ data, updatedAt: Date.now() });
      // A new signed reading arrived: refresh the readings list too.
      if (lastSeq.current !== null && data.lastSeq !== lastSeq.current) void loadReadings();
      lastSeq.current = data.lastSeq;
    } catch {
      setMeter((m) => ({ ...m, error: true }));
    }
  }, [loadReadings]);

  const loadStats = useCallback(async () => {
    try {
      setStats({ data: await readAssetStats(), updatedAt: Date.now() });
    } catch {
      setStats((s) => ({ ...s, error: true }));
    }
  }, []);

  const refresh = useCallback(() => {
    void loadMeter();
    void loadStats();
    void loadReadings();
  }, [loadMeter, loadStats, loadReadings]);

  useEffect(() => {
    refresh();
    const m = setInterval(() => document.visibilityState === "visible" && loadMeter(), meterPollMs);
    const s = setInterval(() => document.visibilityState === "visible" && loadStats(), STATS_POLL_MS);
    return () => {
      clearInterval(m);
      clearInterval(s);
    };
  }, [refresh, loadMeter, loadStats, meterPollMs]);

  return <Ctx.Provider value={{ meter, stats, readings, refresh }}>{children}</Ctx.Provider>;
}

export function useChainData(): ChainData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChainData must be used inside <ChainDataProvider>");
  return v;
}

/** Re-render every `ms` so "x minutes ago" labels stay fresh. */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
