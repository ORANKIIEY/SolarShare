// Keeps a copy of every message the relayer receives, one JSON object per line
// (recordings/meter-YYYY-MM-DD.jsonl). Useful to debug a demo afterwards, and
// `--replay <file>` can play a recording back through the software meter.
//
// The readings are signed public data (no secrets), but the folder is
// git-ignored so recordings don't pile up in the repo.
import fs from "node:fs";
import path from "node:path";

export interface RecordedMessage {
  receivedAt: string;
  /** Broker hostname, or "software-meter". */
  source: string;
  topic: string;
  /** The raw message text, exactly as received. */
  payload: string;
}

export class Recorder {
  readonly file: string;

  constructor(dir: string, now = new Date()) {
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, `meter-${now.toISOString().slice(0, 10)}.jsonl`);
  }

  write(source: string, topic: string, payload: string | Uint8Array): void {
    const entry: RecordedMessage = {
      receivedAt: new Date().toISOString(),
      source,
      topic,
      payload: typeof payload === "string" ? payload : Buffer.from(payload).toString("utf8"),
    };
    try {
      fs.appendFileSync(this.file, JSON.stringify(entry) + "\n");
    } catch (err) {
      // Never let a full disk stop the relayer.
      console.warn(`could not record message: ${(err as Error).message}`);
    }
  }
}

/** Reads a recording back. Lines that aren't valid JSON are skipped. */
export function readRecording(file: string): RecordedMessage[] {
  const out: RecordedMessage[] = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (typeof entry?.payload === "string") out.push(entry);
    } catch {
      // ignore
    }
  }
  return out;
}
