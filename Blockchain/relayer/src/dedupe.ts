// Never send the same reading twice.
//
// The meter publishes on two brokers and the relayer listens on both, so most
// readings arrive twice. A reading is identified by (meterId, seq). We only
// record a seq here AFTER its signature checked out, so someone publishing junk
// with a real seq on the open broker can't block the genuine reading.

export type SeqCheck =
  | { fresh: true }
  | { fresh: false; reason: "duplicate" | "already-onchain" };

export class SeqTracker {
  private readonly handled = new Map<number, Set<bigint>>();
  private readonly onChain = new Map<number, bigint>();

  /** Keeps memory bounded. Older seqs are still caught by the onchain lastSeq check. */
  constructor(private readonly maxRemembered = 5000) {}

  /** Tell the tracker the oracle's lastSeq (at start-up and after each accepted reading). */
  setOnChainSeq(meterId: number, lastSeq: bigint): void {
    const current = this.onChain.get(meterId) ?? 0n;
    if (lastSeq > current) this.onChain.set(meterId, lastSeq);
  }

  onChainSeq(meterId: number): bigint {
    return this.onChain.get(meterId) ?? 0n;
  }

  check(meterId: number, seq: bigint): SeqCheck {
    if (this.handled.get(meterId)?.has(seq)) return { fresh: false, reason: "duplicate" };
    if (seq <= this.onChainSeq(meterId)) return { fresh: false, reason: "already-onchain" };
    return { fresh: true };
  }

  /** Undo markHandled, e.g. when sending failed and a later copy should try again. */
  forget(meterId: number, seq: bigint): void {
    this.handled.get(meterId)?.delete(seq);
  }

  /** Remember a seq as taken: it was submitted, or deliberately skipped. */
  markHandled(meterId: number, seq: bigint): void {
    let set = this.handled.get(meterId);
    if (!set) this.handled.set(meterId, (set = new Set()));
    set.add(seq);
    if (set.size > this.maxRemembered) {
      // Sets iterate in insertion order: drop the oldest.
      const oldest = set.values().next().value;
      if (oldest !== undefined) set.delete(oldest);
    }
  }
}
