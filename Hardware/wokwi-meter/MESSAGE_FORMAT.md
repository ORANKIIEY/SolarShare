# SolarShare meter message format (v1)

This is the contract between three parts of SolarShare. Change it only in all
three places at once:

- the **meter** (`Hardware/wokwi-meter/sketch.ino`) writes it,
- the **relayer** (#14) reads it and submits it onchain,
- the **MeterOracle** contract (#7) checks the signature inside it.

`tools/reading.mjs` holds a working JavaScript version of everything below
(shape check, EIP-712 types, signature recovery). The relayer can reuse it.

## Where messages go

| | |
| --- | --- |
| Brokers | `test.mosquitto.org:1883` (primary), `broker.hivemq.com:1883` (fallback). Plain MQTT, no login. |
| Reading topic | `solarshare/meter/{meterId}/reading`, e.g. `solarshare/meter/1/reading` |
| Saved-state topic | `solarshare/meter/{meterId}/state` (retained, see below) |
| QoS | 0 |
| How often | One reading every 30 seconds (`READING_INTERVAL_S`) |

The meter sends to whichever broker it is connected to, and switches to the
other one if that fails. **Listeners must subscribe on both brokers and
de-duplicate by `(meterId, seq)`.**

Public brokers are open: anyone can publish on these topics. That is fine,
because a message only counts if its signature recovers the registered device
address. Never trust a message because of the topic it came on.

## Payload

One JSON object, UTF-8, no line breaks:

```json
{
  "reading": {
    "meterId": 1,
    "seq": "1794529617",
    "timestamp": "1794529908",
    "energyProducedWh": "417",
    "energySoldWh": "387",
    "powerW": 5006,
    "tamper": false
  },
  "signature": {
    "r": "0x0b757cec4ba4e1a82e36c04ac8e94c10d618f8670a4f0774fcab4fe996425932",
    "s": "0x254bec648514a375788336d6512721bd9efda7412cc12a8d0f216dd508b1ef66"
  },
  "device": "0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3"
}
```

> A real message from the demo meter running in Wokwi, captured from
> `test.mosquitto.org` on 2026-11-13. With the placeholder contract
> `0x1111…1111`, its EIP-712 digest is
> `0x9f48f4c8afd38085fcdcb73561af3eac8f9e1d05d4af4816558f1e3b0383d03e` and it
> recovers to the device address `0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3`
> with `v = 28`.

| Field | JSON type | Solidity type | Meaning |
| --- | --- | --- | --- |
| `reading.meterId` | number | `uint32` | Which meter. `1` for the demo. |
| `reading.seq` | **decimal string** | `uint64` | Sequence number. Always higher than the meter's previous reading, also across restarts. Not consecutive: after a restart it jumps (see below). |
| `reading.timestamp` | **decimal string** | `uint64` | When the reading was taken, Unix seconds (UTC), from NTP. |
| `reading.energyProducedWh` | **decimal string** | `uint64` | Lifetime energy the panels produced, whole Wh. Never goes down. |
| `reading.energySoldWh` | **decimal string** | `uint64` | Lifetime energy delivered to paying customers, whole Wh. Never goes down, never above produced. |
| `reading.powerW` | number | `uint32` | Power being produced right now, W (0 to 10,000). |
| `reading.tamper` | boolean | `bool` | `true` while the meter's tamper switch is open. |
| `signature.r` | string | `bytes32` | ECDSA `r`, `0x` + 64 lowercase hex. |
| `signature.s` | string | `bytes32` | ECDSA `s`, `0x` + 64 lowercase hex. Always "low-s" (≤ n/2). |
| `device` | string | `address` | The meter's address, EIP-55 checksummed. **Informational only**: always compare the recovered signer with the address registered in MeterOracle, never with this field. |

64-bit values are strings because JavaScript numbers lose precision above
2^53. Parse them with `BigInt`.

## What is signed (EIP-712)

Domain:

| Field | Value |
| --- | --- |
| `name` | `SolarShare MeterOracle` |
| `version` | `1` |
| `chainId` | `84532` (Base Sepolia) |
| `verifyingContract` | The MeterOracle address, set in the meter's `secrets.h`. Until it is deployed: `0x1111111111111111111111111111111111111111`. |

Type (field order is part of the hash, it is identical to the spike in #4):

```
MeterReading(uint32 meterId,uint64 seq,uint64 timestamp,uint64 energyProducedWh,uint64 energySoldWh,uint32 powerW,bool tamper)
```

```solidity
struct MeterReading {
    uint32 meterId;
    uint64 seq;
    uint64 timestamp;
    uint64 energyProducedWh;
    uint64 energySoldWh;
    uint32 powerW;
    bool tamper;
}
```

digest = `keccak256(0x19 0x01 ‖ domainSeparator ‖ hashStruct(reading))`, the
standard EIP-712 digest. OpenZeppelin's `EIP712("SolarShare MeterOracle", "1")`
plus `_hashTypedDataV4` gives the same value.

### No `v` in the message

The meter's signing library (micro-ecc) gives only `r` and `s`. To get the
65-byte Ethereum signature, try `v = 27` and `v = 28` and keep the one that
recovers the registered device address (`recoverSigner()` in
`tools/reading.mjs` does this). Because `s` is low, OpenZeppelin's
`ECDSA.recover` accepts the result.

## Saved state (retained message)

Wokwi forgets everything when the simulation stops, but the oracle rejects
readings whose totals go down. So after each successful send, the meter also
publishes its latest reading, unchanged, as a **retained** message on
`solarshare/meter/{meterId}/state`. When it boots, it reads that back from
both brokers, keeps the one with the highest `seq` that carries **its own valid
signature** for the current contract, and continues from those totals.

- The relayer should ignore `.../state`. Every state message was already sent
  on `.../reading`.
- If neither broker has a saved state (first ever run, broker wiped, contract
  address changed), the totals start again from 0 Wh. MeterOracle will then
  reject the readings as "energy going down" until it is reset or redeployed.
  A real meter keeps its totals in flash, so this only affects the simulation.

## Live preview (unsigned)

Every 2 seconds the meter also publishes what its dials say **right now** on
`solarshare/meter/{meterId}/live` (not retained):

```json
{"meterId":1,"t":1794640702,"producedW":5006,"stolenW":2000,"soldW":2656,
 "gapPct":47,"theft":true,"tamper":false,"nextReadingS":14,"queued":0}
```

| Field | Meaning |
| --- | --- |
| `t` | meter clock, Unix seconds |
| `producedW`, `stolenW`, `soldW` | power right now, watts |
| `gapPct` | how far sold is behind produced right now (includes the ~7% normal losses) |
| `theft`, `tamper` | what the meter's own check says right now |
| `nextReadingS` | seconds until the next signed reading |

It is **not signed** and anyone can publish on a public broker, so it must
never decide payouts. The web app shows it as an early warning ("meter sees
possible theft, checking the signed reading"); payout status always comes from
the signed readings on `.../reading` via the relayer and MeterOracle. The
relayer ignores `.../live`.

## Quick readings when theft starts or stops

Readings normally go out every 30 s. When the meter's own check flips (theft
or tamper starts or stops, and stays that way for 1 s), it closes the current
reading as soon as it covers at least 20 Wh of production (about 14 s at 5 kW,
never under 10 s), then sends a clean reading of the new state one such window
later. So the oracle sees the change within roughly 15–30 s instead of up to a
minute, and recovery never waits on a reading that still mixes in stolen power.
The 20 Wh floor matters: energy is counted in whole Wh, and over a very short
window a 1 Wh rounding step alone could look like a 15% gap.

## Sequence numbers across restarts

On boot, `seq` starts at the current Unix time, or one past the saved state's
`seq` if that is higher, then goes up by 1 per reading. Because the meter sends
far less than one reading per second, this is always higher than anything it
sent before a restart, even without saved state.

## Offline queue

While the meter can't reach a broker, readings wait in a queue (120 readings,
one hour) and are sent oldest first once it reconnects. They keep their
original `timestamp`, so after an outage a burst of older readings arrives
within a few seconds. If the queue overflows, the oldest reading is dropped.
No energy is lost, because every reading carries the lifetime totals.

## Notes for MeterOracle and the relayer

- **Rounding:** totals are whole Wh, so between two readings each total can be
  up to 1 Wh off. At 5 kW a 30-second step is about 42 Wh, so the normal 7%
  loss shows as 5 to 10%. At low sun (under about 2.4 kW, which is under
  20 Wh per step) one step is too small to judge. The theft check should not
  fire on tiny steps. Two ways to handle that: compare over a longer window,
  or skip steps where produced grew by less than about 20 Wh.
- **Timestamps:** queued readings can arrive up to an hour late. If the oracle
  rejects "too old" readings, the limit decides how much of an outage can be
  replayed. Readings it rejects for age are only lost history, because the
  next accepted reading carries the totals.
- **Energy versus time:** produced energy per step can be as much as
  10 kW × the time between the two readings (about 83 Wh per 30 s), plus
  1 Wh of rounding.
- **Physical limits:** `powerW` is at most 10,000. `energySoldWh` is never above
  `energyProducedWh`.
