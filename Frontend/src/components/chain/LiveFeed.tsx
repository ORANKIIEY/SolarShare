"use client";

// The meter's live preview (unsigned, about every 2 s), streamed from
// /api/meter/live. Used to react to the dials at once; payout status still
// comes only from the signed readings on the blockchain (ChainData).
import { createContext, useContext, useEffect, useState } from "react";

export interface LiveSample {
  t: number;
  producedW: number;
  stolenW: number;
  soldW: number;
  gapPct: number;
  theft: boolean;
  tamper: boolean;
  nextReadingS: number;
  receivedAt: number;
}

interface LiveCtx {
  sample: LiveSample | null;
  /** A sample arrived in the last 8 s (the meter sends every 2 s). */
  fresh: boolean;
  /** When the last sample arrived, in this browser's clock. */
  seenAt: number | null;
}

const Ctx = createContext<LiveCtx>({ sample: null, fresh: false, seenAt: null });
const FRESH_MS = 8_000;

export function LiveFeedProvider({ children }: { children: React.ReactNode }) {
  const [sample, setSample] = useState<LiveSample | null>(null);
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      es = new EventSource("/api/meter/live");
      es.addEventListener("sample", (e) => {
        try {
          setSample(JSON.parse((e as MessageEvent).data));
          setSeenAt(Date.now());
        } catch {
          /* ignore a bad message */
        }
      });
      es.onerror = () => {
        es?.close();
        retry = setTimeout(open, 3000);
      };
    };
    open();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      es?.close();
      clearTimeout(retry);
      clearInterval(tick);
    };
  }, []);

  const fresh = seenAt !== null && now - seenAt < FRESH_MS;
  return <Ctx.Provider value={{ sample, fresh, seenAt }}>{children}</Ctx.Provider>;
}

export const useLiveFeed = () => useContext(Ctx);
