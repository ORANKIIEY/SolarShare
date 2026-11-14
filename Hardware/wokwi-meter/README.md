# SolarShare meter (Wokwi): issues #12 and #13

This is the SolarShare meter: the device that tells the blockchain how much
electricity the community solar mini-grid produced and sold. It runs on a
simulated ESP32 in [Wokwi](https://wokwi.com), so anyone, including a judge,
can turn the dials in a browser.

## What it does, in plain English

1. **Measures.** Two dials stand in for real sensors:
   - the **sunlight** slider sets how much power the panels produce (0 to
     10,000 W, because the mini-grid is rated 10 kW);
   - the **illegal connection** knob sets how much power someone steals off
     the line before it reaches paying customers (0 to 5,000 W).
2. **Counts.** It adds power up over time into two lifetime totals, like the
   numbers on an electricity meter. Neither total ever goes down.
   - **Energy produced** (Wh): everything the panels made.
   - **Energy sold** (Wh): produced, minus about 7% normal losses in cables
     and the inverter, minus whatever is stolen.
3. **Signs.** Every 30 seconds it takes a reading: the two totals, the power
   right now, the tamper switch, the real time (from the internet, NTP) and a
   sequence number that only goes up. It signs the reading with its own secret
   key, so nobody can change the numbers or invent readings without the
   signature breaking. This uses EIP-712, the same signing code proven in the
   spike (`Hardware/wokwi-spike/`, issue #4).
4. **Sends.** It publishes the signed reading over MQTT, a lightweight
   "post a message to a topic" protocol, to a free public broker. The relayer
   (#14) picks it up there and submits it to the MeterOracle contract.

If sold energy falls more than 15% behind produced energy, the contract treats
it as **theft**. Normal losses are 7%, so stealing more than about 8% of the
power produced trips it. Payouts also pause on **tamper**, or if the meter goes
**offline** for too long.

The exact message format is in [MESSAGE_FORMAT.md](MESSAGE_FORMAT.md).

## The circuit

| Part | Pin | What it means |
| --- | --- | --- |
| Slide potentiometer (left, top) | GPIO 34 | **Sunlight**: slide right for more power produced |
| Round potentiometer (right, top) | GPIO 35 | **Illegal connection**: turn clockwise to steal more power |
| Left slide switch (bottom) | GPIO 27 | **Tamper**: slide to the right = the meter box was opened |
| Right slide switch (bottom) | GPIO 14 | **Network**: slide to the right = internet cut (to test the offline queue) |
| Green LED | GPIO 25 | Connected, everything sent |
| Yellow LED | GPIO 26 | Offline, or readings waiting to be sent |
| Red LED | GPIO 33 | Tamper, or the meter sees theft right now |

## Files

| File | What it is |
| --- | --- |
| `sketch.ino` | The firmware. |
| `diagram.json` | The Wokwi circuit above. |
| `libraries.txt` | Tells Wokwi to install `micro-ecc` (signing) and `PubSubClient` (MQTT). |
| `secrets.example.h` | Template for `secrets.h`. |
| `secrets.h` | Your device **test** key. Git-ignored, never committed. |
| `MESSAGE_FORMAT.md` | The MQTT message format the relayer and the contract depend on. |
| `tools/` | A small checker for your laptop (Node.js). |

The device key is a throwaway test key. It never holds money and is only used
for this demo. A real meter would keep its key in a secure chip (for example an
ATECC608), not in a source file.

## Run the meter on wokwi.com (step by step)

You don't need a Wokwi account.

1. Open <https://wokwi.com/projects/new/esp32>. A new ESP32 project opens with
   the code on the left (tabs `sketch.ino` and `diagram.json`) and the circuit
   on the right.
2. **sketch.ino**: click the `sketch.ino` tab, click inside the code, press
   `Ctrl+A`, then `Delete`. On your laptop, open
   `Hardware/wokwi-meter/sketch.ino` in Notepad or VS Code, press `Ctrl+A`,
   `Ctrl+C`, and paste it into Wokwi with `Ctrl+V`.
3. **diagram.json**: click the `diagram.json` tab and do the same with
   `Hardware/wokwi-meter/diagram.json`. The circuit on the right changes to
   the ESP32 with two dials, two switches and three LEDs.
4. **libraries.txt**: click the small down-arrow (▾) at the right end of the
   tab bar and choose **New file…**. Name it `libraries.txt` and paste in
   `Hardware/wokwi-meter/libraries.txt`. If Wokwi already shows a
   `libraries.txt` tab, replace its contents instead.
5. **secrets.h**: ▾ again, **New file…**, name it exactly `secrets.h`. Paste in
   the contents of your spike key file,
   `C:\Projects\SolarShare\Hardware\wokwi-spike\secrets.h` (one line starting
   with `#define DEVICE_PRIVATE_KEY_HEX`). That is enough: the contract address
   defaults to the placeholder `0x1111…1111` until MeterOracle is deployed.
   Paste the code; don't use **Upload file(s)…** for `sketch.ino` and
   `diagram.json`, because uploading doesn't replace the files Wokwi already
   has.
6. Click the green **▶ Start the simulation** button. The first build takes a
   minute or two. The serial monitor opens under the circuit and shows:
   - `[meter] id 1, device address 0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3`.
     If the address is different, `secrets.h` has the wrong key.
   - `[wifi] … connected`, `[time] … <today's date> UTC`,
     `[resume] …` (about 6 seconds), `[mqtt] connected to test.mosquitto.org:1883`;
   - a `[now]` line every 5 seconds with the live power numbers;
   - a `[reading]` block every 30 seconds, followed by `[mqtt] sent seq …`.
7. **Keep the Wokwi tab visible during a demo.** Wokwi pauses the simulation
   while its browser tab is hidden (another tab in front, or the window
   minimised). While paused, the meter sends nothing, so after 2 minutes the
   web app shows the meter as **offline**. That part is honest: the meter
   really was silent. Put the Wokwi tab in its own window if you need to show
   the web app at the same time.
8. **Don't click Save or Share while `secrets.h` is in the project.** Saved
   Wokwi projects can be public. If you want to save it, delete `secrets.h`
   first.

### Things to try while it runs

Click a part in the circuit to use it while the simulation runs.

- **Sunlight:** drag the slider's handle. The `[now]` line's `sun` value
  follows it within a second. The next reading's `produced` grows faster or
  slower.
- **Steal power:** turn the round knob. `stolen` goes up and `sold` goes down,
  and the red LED lights once more than about 8% of the power is stolen. In
  the next `[reading]` block, `sold` grows more slowly than `produced`, and
  `gap` goes above 15% with `<-- THEFT`.
- **Tamper:** click the left slide switch. The red LED lights, and the next
  reading says `tamper YES`.
- **Cut the internet:** click the right slide switch. The yellow LED lights
  and readings stay in the queue (`queued 1`, `queued 2`, …). Click it back:
  the queued readings are sent in order (`sent seq …` lines, oldest first).
- **Restart:** stop and start the simulation. `[resume] found seq …: carrying
  on from …` shows the meter picked up its totals again, so they never go
  down. Wokwi has no lasting memory, so the meter saves its last signed
  reading on the MQTT broker and reads it back at boot. See
  [MESSAGE_FORMAT.md](MESSAGE_FORMAT.md#saved-state-retained-message).

### The clock after a pause

The meter gets the real time from the internet (NTP) at boot and then counts
on its own clock. A pause in Wokwi also stops that clock, so it falls behind.
Even without a pause, Wokwi often runs slower than real time (the speed, for
example `67%`, shows above the serial monitor), so the clock loses a few
seconds every half minute.

To fix that, the meter asks an NTP server for the time again just before
every reading (one small message, usually answered in under half a second).
If its clock is off by a second or more, it corrects it and prints a line
such as:

```
[time] clock was 4.8 s behind real time (Wokwi runs slower than real time), corrected to 2026-11-13 20:29:20 UTC
[time] clock was 1040.2 s behind real time (was the simulation paused?), corrected to 2026-11-13 21:05:12 UTC
```

A short `[time]` line before every reading is normal on a slow simulation.

So the first reading after a pause already carries the right time, and the
web app goes back to online (and green, if there's no theft) as soon as that
reading reaches the contract. Without this, every reading after a pause had
an old time, so the contract kept calling the meter offline. While the
network switch is OFF, the meter skips the check (it has no internet) and
keeps counting on its own clock.

To see it work: start the simulation, wait for a `[reading]`, click Wokwi's
**pause** button (⏸, next to stop) for a couple of minutes, then resume. The
next `[reading]` shows a `[time] clock was … behind` line just before it, and
its `at …` time matches your laptop's clock (in UTC).

## Check the readings on your laptop

The checker listens to the same MQTT topic on both brokers and, for each
reading, recovers who signed it. You need [Node.js](https://nodejs.org) 20 or
newer. No wallet, blockchain or contract needed.

1. Open a terminal (PowerShell) in this folder's `tools` subfolder:

   ```bash
   cd Hardware/wokwi-meter/tools
   ```

2. Install it (first time only):

   ```bash
   npm install
   ```

3. Start it:

   ```bash
   npm run check
   ```

4. Within 30 seconds of the Wokwi meter sending, you see blocks like:

   ```
   ✔ VALID  meter 1  seq 1794571211  2026-11-13 12:03:06 UTC (2s ago, via test.mosquitto.org)
     signature: recovers to 0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3 (v=27)
     produced 250 Wh (+42)   sold 222 Wh (+29)   sold is 31% behind produced -> THEFT
     power 5,001 W   tamper no
   ```

   - `✔ VALID` means the signature recovers to the device address
     `0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3`, `seq` went up, and the
     totals didn't go down.
   - The `(+…)` numbers are how much each total grew since the last reading.
     With no theft, sold is about 7% behind produced (5 to 10% because the
     totals are whole Wh). Turn up the illegal connection and it goes above
     15%: `THEFT`.
   - Below about 2.4 kW of sun, a 30-second step is too small to judge, and
     the checker says so.
5. Press `Ctrl+C` to stop.

Options:

```bash
npm run check -- --meter 1
```

```bash
npm run check -- --raw
```

```bash
npm run check -- --contract 0xYourMeterOracleAddress
```

`--raw` also prints each digest and the raw JSON. Use `--contract` once
MeterOracle is deployed and its address is in `secrets.h`. The signature only
recovers correctly when both use the same contract address.

## Change the settings

Add any of these lines to `secrets.h` (defaults shown):

```c
#define VERIFYING_CONTRACT "0x1111111111111111111111111111111111111111"
#define METER_ID 1
#define READING_INTERVAL_S 30
#define MQTT_PRIMARY_HOST "test.mosquitto.org"
#define MQTT_FALLBACK_HOST "broker.hivemq.com"
```

## Limits (demo, not production)

- The key sits in a source file. A real meter keeps it in a secure chip and
  signs with RFC 6979 deterministic nonces (`uECC_sign_deterministic`).
- Public MQTT brokers have no login and can drop messages. That doesn't make
  readings forgeable, because only the device's signature counts, but a real
  deployment would use a private broker with TLS.
- Lifetime totals are kept on the broker (retained message) instead of in
  flash, because Wokwi can't keep memory between runs. If both brokers lose
  it, the totals restart at 0 and MeterOracle will refuse them until it is
  reset.
- The offline queue lives in RAM (one hour of readings). A restart while
  offline loses the queued readings, but not the energy: the next reading
  carries the totals.
