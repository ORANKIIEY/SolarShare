# Wokwi spike: the ESP32 signs a meter reading (issue #4)

## What this proves

SolarShare's payouts depend on the solar meter telling the truth. So the meter
signs every reading with its own private key, and the blockchain checks that
signature before it accepts the reading.

This spike checks that the signing really works on an ESP32, in a way an
Ethereum smart contract can check with `ecrecover`:

1. The ESP32 builds an **EIP-712** "typed data" hash of one meter reading.
   EIP-712 is the standard way to hash structured data so a contract can
   rebuild the exact same hash.
2. It hashes with **Keccak-256**. That is Ethereum's hash. It is *not* the
   same as the official SHA3-256, which pads differently and gives a
   different result.
3. It signs that hash with **secp256k1**, Ethereum's curve, using the
   [`micro-ecc`](https://github.com/kmackay/micro-ecc) library.
4. It prints the reading, the hash, the signature (`r`, `s`) and the device's
   Ethereum address to the serial console.
5. On the laptop, `npm run verify-spike` (in `Blockchain/`) rebuilds the same
   hash with viem and recovers the signer from the signature. If it equals the
   device address, the spike worked.

## What's signed

EIP-712 domain:

| Field | Value |
| --- | --- |
| `name` | `SolarShare MeterOracle` |
| `version` | `1` |
| `chainId` | `84532` (Base Sepolia) |
| `verifyingContract` | `0x1111111111111111111111111111111111111111` (**fixed placeholder for the spike**; the real MeterOracle address replaces it in #7) |

Struct:

```
MeterReading(uint32 meterId,uint64 seq,uint64 timestamp,uint64 energyProducedWh,uint64 energySoldWh,uint32 powerW,bool tamper)
```

The hard-coded reading is: meter 1, sequence 42, timestamp 1794571200
(2026-11-13 12:00 UTC), 12,345,678 Wh produced, 9,876,543 Wh sold, 3,250 W,
no tamper.

## Files

| File | What it is |
| --- | --- |
| `sketch.ino` | The program. Includes a small Keccak-256 written for this project. |
| `diagram.json` | The Wokwi circuit: just an ESP32 DevKit C v4 and the serial monitor. |
| `libraries.txt` | Tells Wokwi to install `micro-ecc`. |
| `secrets.example.h` | Template for the device key. |
| `secrets.h` | The real device **test** key. Git-ignored, never committed. Only on your laptop. |

The device key is a throwaway test key. It never holds money and it is only
used for this demo. A real meter would keep its key in secure hardware (for
example an ATECC608 chip), not in source code.

## Run it on wokwi.com (step by step)

You don't need an account to run it.

1. Open <https://wokwi.com/projects/new/esp32>. A new ESP32 project opens with
   two tabs: `sketch.ino` and `diagram.json`.
2. **sketch.ino**: click the `sketch.ino` tab, click inside the code, press
   `Ctrl+A` then `Delete`. Open `Hardware/wokwi-spike/sketch.ino` from this repo
   in Notepad or VS Code, copy all of it, and paste it into Wokwi.
3. **diagram.json**: click the `diagram.json` tab and do the same with
   `Hardware/wokwi-spike/diagram.json`.
4. **libraries.txt**: click the small down-arrow (▾) at the right end of the
   tab bar and choose **New file…**. Name it `libraries.txt`, then paste in
   the contents of `Hardware/wokwi-spike/libraries.txt`. (Another way: open the
   **Library Manager** tab, click **+**, search for `micro-ecc` and click it.)
5. **secrets.h**: use the ▾ arrow again, **New file…**, and name it exactly
   `secrets.h`. Open `Hardware/wokwi-spike/secrets.h` on your laptop and paste
   its contents in. It is one line that starts with
   `#define DEVICE_PRIVATE_KEY_HEX`.
   (Tip: instead of steps 2–5 you can use ▾ → **Upload file(s)…** and pick the
   four files from `Hardware/wokwi-spike/`.)
6. Click the green **▶ Start the simulation** button. The first build takes
   about a minute. The serial monitor opens under the circuit.
7. In the serial monitor, select everything from
   `--- BEGIN SOLARSHARE SPIKE ---` to `--- END SOLARSHARE SPIKE ---`, and copy
   it (`Ctrl+C`).
8. Don't click **Save** or **Share** while `secrets.h` is in the project. Saved
   Wokwi projects can be public. If you want to save it, delete `secrets.h`
   first.

Expected `deviceAddress`: the address written in the comment at the top of
your `secrets.h` file.

## Check it on the laptop

1. In `Blockchain/`, create a file called `spike-output.txt` and paste the
   copied serial output into it. (It is git-ignored.)
2. Run:

   ```bash
   cd Blockchain
   npm run verify-spike
   ```

3. Every line should say `PASS`, ending with `All checks passed.`

The script checks that:

- the device used the agreed domain (name, version, chain id, placeholder
  contract);
- the type hash, domain separator, struct hash and final digest all match
  viem;
- `s` is "low" (Ethereum and OpenZeppelin reject high-`s` signatures, so the
  sketch flips a high `s` to `n − s`);
- recovering with `v = 27` or `v = 28` gives the device address;
- the device address matches the key in your local `secrets.h`.

`Blockchain/test/SpikeSignatureCheck.ts` also checks the same signature inside
a Solidity contract, using OpenZeppelin's `ECDSA.recover`. That is what the
real MeterOracle will use.

## What we learned (input for MeterOracle, issue #7)

- Signing on the ESP32 itself works. No gateway key is needed to vouch for
  readings, so the on-device signature *is* the proof.
- The device outputs only `r` and `s`. `micro-ecc` doesn't give the recovery
  bit `v`, so the relay tries `v = 27` and `v = 28` off-chain and submits the
  one that recovers the registered device address. The contract can take
  `(v, r, s)` or a 65-byte signature.
- The sketch makes `s` low before printing, so OpenZeppelin's `ECDSA.recover`
  accepts the signature.
- The digest uses the standard EIP-712 domain. The contract can use
  OpenZeppelin's `EIP712` base with name `SolarShare MeterOracle` and version
  `1`. The device then needs the deployed MeterOracle address as
  `verifyingContract`.
- Signing uses a random nonce from the ESP32's hardware RNG (`esp_random`).
  A production build should switch to RFC 6979 deterministic signing
  (`uECC_sign_deterministic`), so a weak RNG can't leak the key.
