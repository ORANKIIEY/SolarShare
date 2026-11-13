#!/usr/bin/env node
// SolarShare meter checker.
//
// Listens to the meter's MQTT topic on both public brokers and prints every
// reading, with:
//   - whether its signature recovers the expected device address,
//   - whether seq went up and the energy totals did not go down,
//   - how far sold energy fell behind produced energy since the last reading
//     (the MeterOracle flags THEFT above 15%).
//
// No blockchain, wallet or contract needed.
//
//   npm run check                       live, all meters
//   npm run check -- --meter 1          live, meter 1 only
//   npm run check -- --contract 0x...   after MeterOracle is deployed
//   npm run check -- --file msgs.txt    check saved messages (one JSON per line)

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import mqtt from "mqtt";
import { PLACEHOLDER_CONTRACT, TEST_DEVICE, digestOf, parseMessage, recoverSigner } from "./reading.mjs";

const { values: opts } = parseArgs({
  options: {
    device: { type: "string", default: TEST_DEVICE },
    contract: { type: "string", default: PLACEHOLDER_CONTRACT },
    meter: { type: "string", default: "+" },
    brokers: { type: "string", default: "test.mosquitto.org,broker.hivemq.com" },
    file: { type: "string" },
    raw: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (opts.help) {
  console.log(`Usage: npm run check -- [--meter 1] [--device 0x...] [--contract 0x...] [--raw] [--file msgs.txt]
  --device    address the signatures must recover to (default ${TEST_DEVICE})
  --contract  MeterOracle address the meter signs for (default placeholder ${PLACEHOLDER_CONTRACT})
  --meter     only this meter id (default: all)
  --brokers   comma-separated MQTT hosts (default test.mosquitto.org,broker.hivemq.com)
  --raw       also print each raw JSON message
  --file      check a file of saved messages instead of listening live`);
  process.exit(0);
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const green = paint(32), red = paint(31), yellow = paint(33), dim = paint(2), bold = paint(1);
const fmt = (n) => BigInt(n).toLocaleString("en-US");
const THEFT_GAP_PERCENT = 15n;
const MIN_WH_TO_JUDGE = 20n;

const seen = new Set(); // "meterId:seq", so a message on both brokers is shown once
const last = new Map(); // meterId -> previous reading
let total = 0, bad = 0;

async function handle(text, source) {
  const msg = parseMessage(text);
  if (!msg.ok) {
    total++, bad++;
    console.log(red(`\n✗ bad message from ${source}: ${msg.errors.join("; ")}`));
    console.log(dim(`  ${String(text).slice(0, 300)}`));
    return;
  }
  const r = msg.reading;
  if (opts.meter !== "+" && String(r.meterId) !== opts.meter) return;
  const key = `${r.meterId}:${r.seq}`;
  if (seen.has(key)) return;
  seen.add(key);
  total++;

  const problems = [];
  const sig = await recoverSigner(msg, opts.contract, opts.device);
  if (msg.device !== sig.recovered[0] && msg.device !== sig.recovered[1])
    problems.push(`the signature does not match the "device" field ${msg.device}`);
  if (!sig.valid) problems.push(`not signed by ${opts.device} (recovers to ${sig.recovered.join(" or ")})`);

  const prev = last.get(r.meterId);
  let dProduced = null, dSold = null;
  if (prev) {
    if (r.seq <= prev.seq) problems.push(`seq did not go up (${prev.seq} -> ${r.seq})`);
    if (r.timestamp < prev.timestamp) problems.push("timestamp went backwards");
    if (r.energyProducedWh < prev.energyProducedWh) problems.push("energy produced went DOWN");
    if (r.energySoldWh < prev.energySoldWh) problems.push("energy sold went DOWN");
    dProduced = r.energyProducedWh - prev.energyProducedWh;
    dSold = r.energySoldWh - prev.energySoldWh;
  }
  if (r.energySoldWh > r.energyProducedWh) problems.push("more energy sold than produced");
  if (r.powerW > 10000) problems.push("power above the 10 kW rating");
  if (!prev || r.seq > prev.seq) last.set(r.meterId, r);

  const when = new Date(Number(r.timestamp) * 1000).toISOString().replace("T", " ").slice(0, 19);
  const age = Math.round(Date.now() / 1000 - Number(r.timestamp));
  const head = sig.valid && problems.length === 0 ? green("✔ VALID") : red("✗ INVALID");
  console.log(`\n${head}  meter ${r.meterId}  seq ${r.seq}  ${when} UTC ${dim(`(${age}s ago, via ${source})`)}`);
  if (sig.valid) console.log(`  signature: recovers to ${green(sig.recovered[sig.v - 27])} (v=${sig.v})`);

  let line = `  produced ${bold(fmt(r.energyProducedWh))} Wh`;
  if (dProduced !== null) line += ` (+${fmt(dProduced)})`;
  line += `   sold ${bold(fmt(r.energySoldWh))} Wh`;
  if (dSold !== null) line += ` (+${fmt(dSold)})`;
  if (dProduced !== null && dProduced > 0n && dProduced < MIN_WH_TO_JUDGE) {
    // Totals are whole Wh, so a step of a few Wh is mostly rounding.
    line += dim(`   too little energy since the last reading to judge theft`);
  } else if (dProduced !== null && dProduced > 0n && dSold <= dProduced) {
    const gap = ((dProduced - dSold) * 100n + dProduced / 2n) / dProduced;
    line += gap > THEFT_GAP_PERCENT
      ? red(`   sold is ${gap}% behind produced -> THEFT`)
      : green(`   sold is ${gap}% behind produced -> normal`);
  } else if (dProduced === 0n) {
    line += dim("   no sun since the last reading");
  }
  console.log(line);
  console.log(`  power ${fmt(r.powerW)} W   tamper ${r.tamper ? red("YES") : "no"}`);
  for (const p of problems) console.log(red(`  ✗ ${p}`));
  if (problems.length) bad++;
  if (opts.raw) {
    console.log(dim(`  digest ${digestOf(r, opts.contract)}`));
    console.log(dim(`  ${typeof text === "string" ? text : JSON.stringify(text)}`));
  }
}

function showSaved(text, source) {
  const msg = parseMessage(text);
  if (!msg.ok) return;
  const r = msg.reading;
  if (opts.meter !== "+" && String(r.meterId) !== opts.meter) return;
  console.log(
    dim(`[saved on ${source}] meter ${r.meterId} last saved seq ${r.seq}: ` +
      `${fmt(r.energyProducedWh)} Wh produced, ${fmt(r.energySoldWh)} Wh sold`),
  );
}

if (opts.file) {
  const lines = readFileSync(opts.file, "utf8").split(/\r?\n/).filter((l) => l.trim().startsWith("{"));
  for (const l of lines) await handle(l.trim(), opts.file);
  console.log(`\n${total} readings, ${bad ? red(`${bad} with problems`) : green("all valid")}`);
  process.exit(bad ? 1 : 0);
}

console.log(bold("SolarShare meter checker"));
console.log(`  expecting device ${opts.device}`);
console.log(`  contract (EIP-712 verifyingContract) ${opts.contract}`);
console.log(`  listening on solarshare/meter/${opts.meter}/reading  (Ctrl+C to stop)`);
console.log(dim("  A new reading arrives every 30 seconds while the Wokwi simulation runs."));

let queue = Promise.resolve();
for (const host of opts.brokers.split(",").map((h) => h.trim()).filter(Boolean)) {
  const client = mqtt.connect(`mqtt://${host}:1883`, {
    clientId: `solarshare-checker-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });
  let announced = false;
  client.on("connect", () => {
    if (!announced) console.log(green(`  connected to ${host}`));
    announced = true;
    client.subscribe([`solarshare/meter/${opts.meter}/reading`, `solarshare/meter/${opts.meter}/state`]);
  });
  client.on("error", (err) => console.log(yellow(`  ${host}: ${err.message}`)));
  client.on("offline", () => {
    if (announced) console.log(yellow(`  lost ${host}, reconnecting...`));
    announced = false;
  });
  client.on("message", (topic, payload) => {
    const text = payload.toString("utf8");
    if (topic.endsWith("/state")) return showSaved(text, host);
    // One at a time, so a burst of queued readings is compared in order.
    queue = queue.then(() => handle(text, host)).catch((err) => console.log(red(`  error: ${err.message}`)));
  });
}
