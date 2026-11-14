// Live preview from the meter: what its dials say right now, every 2 s, on
// MQTT topic solarshare/meter/<id>/live. One connection per server (to both
// public brokers, like the relayer), shared by every open page.
//
// These messages are NOT signed and anyone could publish on a public broker,
// so the app only uses them as a preview ("the meter sees…"). Payout status
// always comes from the signed readings on the blockchain.
import mqtt, { type MqttClient } from "mqtt";

if (typeof window !== "undefined") throw new Error("liveMeter.ts must never run in a browser");

export interface LiveSample {
  meterId: number;
  t: number; // meter's clock, Unix seconds
  producedW: number;
  stolenW: number;
  soldW: number;
  gapPct: number;
  theft: boolean;
  tamper: boolean;
  nextReadingS: number;
  queued: number;
  receivedAt: number; // server time, ms
  broker: string;
}

const METER_ID = 1;
const TOPIC = `solarshare/meter/${METER_ID}/live`;
const BROKERS = (process.env.MQTT_BROKERS?.trim() || "mqtt://test.mosquitto.org:1883,mqtt://broker.hivemq.com:1883")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

type Listener = (s: LiveSample) => void;

interface State {
  clients: MqttClient[];
  latest: LiveSample | null;
  listeners: Set<Listener>;
}

// Keep one instance across dev-server hot reloads.
const g = globalThis as unknown as { __solarshareLive?: State };

const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null);

function parse(buf: Buffer, broker: string): LiveSample | null {
  if (buf.length > 512) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(buf.toString("utf8"));
  } catch {
    return null;
  }
  const meterId = num(o.meterId, 2 ** 32);
  const t = num(o.t, 2 ** 40);
  const producedW = num(o.producedW, 20_000);
  const stolenW = num(o.stolenW, 20_000);
  const soldW = num(o.soldW, 20_000);
  const gapPct = num(o.gapPct, 100);
  const nextReadingS = num(o.nextReadingS, 3600);
  const queued = num(o.queued, 10_000);
  if (meterId !== METER_ID || t === null || producedW === null || stolenW === null || soldW === null || gapPct === null) return null;
  if (typeof o.theft !== "boolean" || typeof o.tamper !== "boolean") return null;
  return {
    meterId,
    t,
    producedW,
    stolenW,
    soldW,
    gapPct,
    theft: o.theft,
    tamper: o.tamper,
    nextReadingS: nextReadingS ?? 0,
    queued: queued ?? 0,
    receivedAt: Date.now(),
    broker,
  };
}

function start(): State {
  const state: State = { clients: [], latest: null, listeners: new Set() };
  for (const url of BROKERS) {
    const host = url.replace(/^\w+:\/\//, "").replace(/:\d+$/, "");
    const client = mqtt.connect(url, {
      clientId: `solarshare-web-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 3000,
      connectTimeout: 10_000,
      keepalive: 30,
      clean: true,
    });
    client.on("connect", () => client.subscribe(TOPIC, { qos: 0 }));
    client.on("message", (_topic, payload) => {
      const s = parse(payload, host);
      if (!s) return;
      // The meter sends to one broker at a time, so the newest arrival wins.
      state.latest = s;
      for (const l of state.listeners) l(s);
    });
    client.on("error", () => undefined); // reconnects by itself
    state.clients.push(client);
  }
  return state;
}

function live(): State {
  return (g.__solarshareLive ??= start());
}

export function latestLive(): LiveSample | null {
  return live().latest;
}

export function onLive(l: Listener): () => void {
  const s = live();
  s.listeners.add(l);
  return () => s.listeners.delete(l);
}

export function liveConnected(): boolean {
  return live().clients.some((c) => c.connected);
}
