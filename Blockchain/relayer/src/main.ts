// SolarShare relayer: carries signed meter readings from MQTT to MeterOracle.
//
//   npm run relayer                       live: Wokwi meter -> MQTT -> chain
//   npm run relayer -- --replay           DEMO BACKUP: software meter, scripted demo
//   npm run relayer -- --replay --full    ... plus tamper and offline steps
//   npm run relayer -- --replay recordings/meter-2026-11-13.jsonl
//
// Run `npm run relayer -- --help` for every option. Settings: relayer/.env.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { statusName } from "./abi";
import { makeClients } from "./chain";
import { ENV_PATH, RELAYER_DIR, loadConfig, loadEnvFile } from "./config";
import { listen } from "./mqtt";
import { Recorder } from "./recorder";
import { Relayer, statusHint, type Logger } from "./relayer";
import { demoScenario, SoftwareMeter, stepsFromRecording } from "./softwareMeter";

const HELP = `
SolarShare relayer

  npm run relayer                       Live mode: listen to the meter on MQTT and submit readings.
  npm run relayer -- --replay           DEMO BACKUP: software meter plays normal -> theft -> recovery.
  npm run relayer -- --replay --full    Same, plus tamper (and admin clear) and silence-until-OFFLINE.
  npm run relayer -- --replay <file>    Re-sign and replay a recording from relayer/recordings/.

Options:
  --replay [file]      Use the software meter instead of MQTT (needs DEMO_DEVICE_PRIVATE_KEY).
  --tamper             Add the tamper step to the scripted demo.
  --offline            Add the silence-until-OFFLINE step to the scripted demo.
  --full               Both --tamper and --offline.
  --once               Stop after the sequence instead of sending normal readings forever.
  --register-device    Switch the oracle's device to the software meter's key (admin wallet only).
  --no-record          Don't write received messages to relayer/recordings/.
  --new-demo-key       Create a software-meter TEST key in relayer/.env and print its address.
  -h, --help           Show this help.

Settings come from ${ENV_PATH} (copy .env.example).
`;

function makeLogger(): Logger {
  const tty = process.stdout.isTTY;
  const color = (code: number, s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
  const stamp = () => new Date().toTimeString().slice(0, 8);
  const line = (s: string) =>
    s.startsWith("\n") ? `\n${stamp()} ${s.slice(1)}` : `${stamp()} ${s}`;
  return {
    info: (s) => console.log(line(s)),
    warn: (s) => console.log(color(33, line(s))),
    error: (s) => console.error(color(31, line(s))),
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      replay: { type: "boolean", default: false },
      tamper: { type: "boolean", default: false },
      offline: { type: "boolean", default: false },
      full: { type: "boolean", default: false },
      once: { type: "boolean", default: false },
      "register-device": { type: "boolean", default: false },
      "no-record": { type: "boolean", default: false },
      "new-demo-key": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (values["new-demo-key"]) {
    newDemoKey();
    return;
  }
  const replayFile = values.replay ? positionals[0] : undefined;
  if (!values.replay && positionals.length) throw new Error(`Unexpected argument "${positionals[0]}". See --help.`);

  loadEnvFile();
  const config = loadConfig();
  const log = makeLogger();
  const { publicClient, walletClient } = await makeClients(config);

  const relayer = new Relayer({ publicClient, walletClient, oracle: config.oracle, log });
  const state = await relayer.init();
  const recorder = values["no-record"] ? undefined : new Recorder(config.recordDir);
  const balance = await publicClient.getBalance({ address: relayer.relayerAddress });

  console.log("");
  log.info(`SolarShare relayer (${values.replay ? "SOFTWARE METER - DEMO BACKUP" : "live MQTT"})`);
  log.info(`  network   ${config.network} (chain ${relayer.chainId}) via ${config.rpcUrl}`);
  log.info(`  oracle    ${config.oracle} (from ${config.oracleSource})`);
  log.info(`  meter     ${state.meterId}, device ${state.deviceSigner}`);
  log.info(`  relayer   ${relayer.relayerAddress} (pays gas, balance ${formatEther(balance)} ETH)`);
  log.info(
    `  status    ${statusName(state.status)}${statusHint(statusName(state.status))}, last seq ${state.lastSeq}`,
  );
  if (recorder) log.info(`  recording ${recorder.file}`);
  if (balance === 0n) log.warn("  The relayer wallet has no ETH for gas: every submit will fail. Fund it first.");

  const shutdown: Array<() => Promise<void> | void> = [];
  let stopping = false;
  const stop = async () => {
    if (stopping) process.exit(1); // second Ctrl+C: leave now
    stopping = true;
    log.info("Stopping: finishing the reading in progress...");
    for (const fn of shutdown) await fn();
    await relayer.idle();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  if (!values.replay) {
    log.info(`  listening ${config.topic} on ${config.brokers.join(", ")}`);
    console.log("");
    const brokers = listen(
      config.brokers,
      config.topic,
      (msg) => {
        recorder?.write(msg.broker, msg.topic, msg.payload);
        void relayer.handle(msg.payload, msg.broker);
      },
      log,
    );
    shutdown.push(() => brokers.close());
    return; // runs until Ctrl+C
  }

  // ---- Software meter (demo backup) ----
  if (!config.demoDevicePrivateKey) {
    throw new Error(
      "Replay mode needs DEMO_DEVICE_PRIVATE_KEY in relayer/.env: the meter device's TEST key " +
        "(the same one as the Wokwi meter's secrets.h, or any test key plus --register-device).",
    );
  }
  const meter = new SoftwareMeter({
    relayer,
    device: privateKeyToAccount(config.demoDevicePrivateKey),
    publicClient,
    walletClient,
    log,
    intervalMs: config.replayIntervalS * 1000,
    onMessage: (payload) => recorder?.write("software-meter", config.topic, payload),
  });
  shutdown.push(() => meter.stop());
  console.log("");
  log.warn("************************************************************************");
  log.warn("*  DEMO BACKUP: SOFTWARE METER. Readings are signed by this laptop with  *");
  log.warn("*  the meter's TEST key, not by the Wokwi ESP32. Same relay path.        *");
  log.warn("************************************************************************");
  await meter.ensureRegistered(values["register-device"]);

  const steps = replayFile
    ? stepsFromRecording(replayFile)
    : demoScenario({ tamper: values.tamper || values.full, offline: values.offline || values.full });
  const outcomes = await meter.run(steps);

  const count = (k: string) => outcomes.filter((o) => o.kind === k).length;
  log.info(
    `\nSequence done: ${count("accepted")} accepted, ${count("skipped")} skipped, ` +
      `${count("rejected")} rejected, ${count("failed")} failed. Status ${statusName(relayer.state.status)}.`,
  );
  if (values.once) {
    await relayer.idle();
    process.exit(count("failed") > 0 ? 1 : 0);
  }
  await meter.keepAlive();
}

/** Writes a fresh DEMO_DEVICE_PRIVATE_KEY into relayer/.env. The key itself is never printed. */
function newDemoKey() {
  const template = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, "utf8")
    : fs.readFileSync(path.join(RELAYER_DIR, ".env.example"), "utf8");
  const existing = template.match(/^DEMO_DEVICE_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
  if (existing) {
    console.log("relayer/.env already has a DEMO_DEVICE_PRIVATE_KEY, so nothing was changed.");
    console.log(`Software meter address: ${privateKeyToAccount(existing as `0x${string}`).address}`);
    return;
  }
  const key = generatePrivateKey();
  const line = `DEMO_DEVICE_PRIVATE_KEY=${key}`;
  const updated = /^DEMO_DEVICE_PRIVATE_KEY=.*$/m.test(template)
    ? template.replace(/^DEMO_DEVICE_PRIVATE_KEY=.*$/m, line)
    : `${template.trimEnd()}\n${line}\n`;
  fs.writeFileSync(ENV_PATH, updated, { mode: 0o600 });
  console.log("New software-meter TEST key saved to relayer/.env (git-ignored).");
  console.log(`Software meter address: ${privateKeyToAccount(key).address}`);
}

main().catch((err) => {
  console.error(`\nRelayer stopped: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
