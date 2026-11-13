"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Address, Hex } from "viem";
import { addressOf, createKey, forgetAccount, loadKey, loadProfile, saveProfile, type Profile } from "@/lib/account";
import { readHolding, type Holding } from "@/lib/chain";

interface AccountCtx {
  ready: boolean; // finished reading browser storage
  keyHex: Hex | null;
  address: Address | null;
  profile: Profile | null;
  holding?: Holding;
  holdingError: boolean;
  create: (p: Profile) => Address;
  refresh: () => Promise<Holding | undefined>;
  reset: () => void;
}

const Ctx = createContext<AccountCtx | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [keyHex, setKey] = useState<Hex | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [holding, setHolding] = useState<Holding>();
  const [holdingError, setHoldingError] = useState(false);
  const address = keyHex ? addressOf(keyHex) : null;

  useEffect(() => {
    setKey(loadKey());
    setProfile(loadProfile());
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!address) return undefined;
    try {
      const h = await readHolding(address);
      setHolding(h);
      setHoldingError(false);
      return h;
    } catch {
      setHoldingError(true);
      return undefined;
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    void refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 10_000);
    return () => clearInterval(t);
  }, [address, refresh]);

  const create = useCallback((p: Profile) => {
    const k = createKey();
    saveProfile(p);
    setKey(k);
    setProfile(p);
    return addressOf(k);
  }, []);

  const reset = useCallback(() => {
    forgetAccount();
    setKey(null);
    setProfile(null);
    setHolding(undefined);
  }, []);

  return (
    <Ctx.Provider value={{ ready, keyHex, address, profile, holding, holdingError, create, refresh, reset }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAccount(): AccountCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount must be used inside <AccountProvider>");
  return v;
}
