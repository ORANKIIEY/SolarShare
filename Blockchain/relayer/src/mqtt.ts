// Listens to the meter topic on every configured broker at once.
//
// The meter publishes to whichever broker it is connected to and switches to
// the other one when that fails, so we stay subscribed on both. That also IS
// the fallback: if the primary broker goes down, readings keep coming in via
// the second one, and mqtt.js keeps reconnecting to the first in the
// background. The same reading arriving twice is harmless: the relayer
// de-duplicates by (meterId, seq).
import mqtt, { type MqttClient } from "mqtt";
import type { Logger } from "./relayer";

export interface IncomingMessage {
  broker: string;
  topic: string;
  payload: Buffer;
}

export interface BrokerSet {
  close(): Promise<void>;
  connectedBrokers(): string[];
}

/** "mqtt://test.mosquitto.org:1883" → "test.mosquitto.org" */
export function brokerLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function listen(
  brokers: string[],
  topic: string,
  onMessage: (msg: IncomingMessage) => void,
  log: Logger,
): BrokerSet {
  const connected = new Set<string>();
  const clients: MqttClient[] = [];
  const clientId = `solarshare-relayer-${Math.random().toString(16).slice(2, 10)}`;

  const summary = () =>
    connected.size === 0
      ? "NOT connected to any broker (readings will arrive once one is back)"
      : `listening on ${[...connected].join(" + ")}`;

  brokers.forEach((url, index) => {
    const label = brokerLabel(url);
    const role = index === 0 ? "primary" : "fallback";
    const client = mqtt.connect(url, {
      clientId: `${clientId}-${index}`,
      reconnectPeriod: 5_000,
      connectTimeout: 10_000,
      clean: true,
    });
    clients.push(client);

    // mqtt.js retries every 5 s; only log an error when it changes, not each retry.
    let lastError = "";
    client.on("connect", () => {
      lastError = "";
      connected.add(label);
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) log.warn(`MQTT ${label}: could not subscribe to ${topic}: ${err.message}`);
      });
      log.info(`MQTT ${label} (${role}) connected; ${summary()}`);
    });
    const lost = (why: string) => {
      if (!connected.delete(label)) return;
      log.warn(`MQTT ${label} (${role}) ${why}; ${summary()}`);
    };
    client.on("close", () => lost("disconnected"));
    client.on("offline", () => lost("offline"));
    client.on("error", (err) => {
      if (err.message === lastError) return;
      lastError = err.message;
      log.warn(`MQTT ${label} (${role}): ${err.message}; retrying every 5 s in the background`);
    });

    client.on("message", (msgTopic, payload) => {
      // `.../state` is the meter's retained copy of its last reading. It was
      // already sent on `.../reading`, so ignore it (only matters with wildcards).
      if (msgTopic.endsWith("/state")) return;
      onMessage({ broker: label, topic: msgTopic, payload });
    });
  });

  return {
    connectedBrokers: () => [...connected],
    close: async () => {
      await Promise.all(clients.map((c) => c.endAsync(true).catch(() => undefined)));
    },
  };
}
