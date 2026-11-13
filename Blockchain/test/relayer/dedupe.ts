// Relayer unit tests: never send the same seq twice.
import { expect } from "chai";
import { SeqTracker } from "../../relayer/src/dedupe";

describe("relayer: dedupe", function () {
  it("lets a new seq through once, then calls it a duplicate", function () {
    const t = new SeqTracker();
    expect(t.check(1, 100n)).to.deep.equal({ fresh: true });
    t.markHandled(1, 100n);
    expect(t.check(1, 100n)).to.deep.equal({ fresh: false, reason: "duplicate" });
    expect(t.check(1, 101n)).to.deep.equal({ fresh: true });
  });

  it("keeps meters apart", function () {
    const t = new SeqTracker();
    t.markHandled(1, 100n);
    expect(t.check(2, 100n).fresh).to.equal(true);
  });

  it("skips anything at or below the oracle's lastSeq", function () {
    const t = new SeqTracker();
    t.setOnChainSeq(1, 500n);
    expect(t.check(1, 499n)).to.deep.equal({ fresh: false, reason: "already-onchain" });
    expect(t.check(1, 500n)).to.deep.equal({ fresh: false, reason: "already-onchain" });
    expect(t.check(1, 501n).fresh).to.equal(true);
  });

  it("never moves lastSeq backwards", function () {
    const t = new SeqTracker();
    t.setOnChainSeq(1, 500n);
    t.setOnChainSeq(1, 10n);
    expect(t.onChainSeq(1)).to.equal(500n);
  });

  it("forget() lets a failed seq be tried again", function () {
    const t = new SeqTracker();
    t.markHandled(1, 7n);
    t.forget(1, 7n);
    expect(t.check(1, 7n).fresh).to.equal(true);
  });

  it("stays bounded, and the onchain check still catches old seqs", function () {
    const t = new SeqTracker(3);
    for (const s of [1n, 2n, 3n, 4n]) t.markHandled(1, s);
    expect(t.check(1, 1n).fresh).to.equal(true); // forgotten by the set...
    t.setOnChainSeq(1, 4n);
    expect(t.check(1, 1n).fresh).to.equal(false); // ...but the chain remembers
  });
});
