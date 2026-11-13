# Live meter proof on Base Sepolia (issue #5)

On 2026-11-13 the SolarShare meter ran on a simulated ESP32 in Wokwi, signed its
readings, and sent them over MQTT. The relayer put them on Base Sepolia, and
MeterOracle checked each signature and set the meter status. This was the real
Wokwi meter, not the software backup meter.

```
Wokwi ESP32 meter ──MQTT (test.mosquitto.org)──▶ relayer ──▶ MeterOracle 0x3e2e…c8B6 (Base Sepolia)
```

## What it proves

- **Real readings land onchain.** 12 signed readings in 6 minutes, one every
  30 seconds, all accepted (seq `1794569219` to `1794569230`, blocks
  58236948 to 58238649). None were rejected and none failed.
- **Theft pauses payouts.** When the "illegal connection" dial was turned up,
  sold energy fell more than 15% behind produced energy and the status
  switched to **THEFT**. A payout claim then reverted with `MeterNotOk(THEFT)`.
- **It recovers by itself.** When the dial went back to zero, the next reading
  switched the status back to **OK**, with no admin action. A payout claim then
  only failed with `NothingToClaim`, because the test wallet owns no shares.

## The transactions

| What happened | seq | Gap | Status | Transaction |
| --- | --- | --- | --- | --- |
| First reading from the Wokwi meter (dial was not at zero yet) | 1794569219 | 36.6% | OFFLINE → THEFT | [0x82ff…2490](https://sepolia.basescan.org/tx/0x82ff71cb493b611ff49e7979fc9f8384001a86bd4fed0b36afee80a2bf992490) |
| Dial to zero | 1794569226 | 12.2% | THEFT → OK | [0x71e9…0a93](https://sepolia.basescan.org/tx/0x71e98b242a18dc30ec69c490bbc4e5cf9779a3c470f4cf5cbd46219ff85b0a93) |
| Theft test: dial turned up | 1794569227 | 21.4% | **OK → THEFT** | [0x216c…7591](https://sepolia.basescan.org/tx/0x216c3a16f67aa5f46647aadf56de9490fdbd7cbd9ac9a288175ede8707177591) |
| Dial back to zero | 1794569230 | 7.1% | **THEFT → OK** | [0xfa73…1661](https://sepolia.basescan.org/tx/0xfa73da8ccc4b2952fdcf4e6f1df20f0a9d763c52be8a5d5b0a81accfcf641661) |

"Gap" is how far sold energy fell behind produced energy since the previous
reading. Normal cable and inverter losses are about 7%. Over 15% counts as
theft.

## Cost

The 12 readings cost the relayer wallet about 0.0000045 test ETH in total,
about 0.0000004 ETH each.

## The recording

[`meter-2026-11-13.jsonl`](meter-2026-11-13.jsonl) holds the 12 messages
exactly as the relayer received them from the broker, one JSON object per
line. They are public, signed readings, not secrets. Anyone can check that each
signature recovers to the registered meter address
`0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3` for MeterOracle
`0x3e2e7f87610d978b922f5bD18624101d30D7c8B6` on chain 84532. See
[`Hardware/wokwi-meter/MESSAGE_FORMAT.md`](../../Hardware/wokwi-meter/MESSAGE_FORMAT.md).

The oracle has already accepted these sequence numbers, so it won't take the
same messages twice. To play the same pattern again, for example if Wokwi is
down during a demo, replay the file. The software meter re-signs each reading
with fresh times and sequence numbers, and carries on from the oracle's
current totals. This needs `DEMO_DEVICE_PRIVATE_KEY` in `Blockchain/relayer/.env`:

```bash
npm run relayer -- --replay ../docs/live-meter-proof/meter-2026-11-13.jsonl
```

Run that from `Blockchain/`.

## Demo tip

Before the live demo, check that Wokwi's `[now]` line shows `stolen 0 W`.
In this run the dial was not at zero when the meter started, so the very first
reading already said THEFT. Turning the dial clockwise steals more power.
