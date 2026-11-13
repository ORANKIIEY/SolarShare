// Tiny HTTP front for the sponsor (no framework, just node:http).
//
//   POST /sponsor  {"address": "0x…"}   top up an approved investor wallet
//   GET  /health                         sponsor address, balances, limits
//
// CORS is on, so the web app can call it straight from the browser.
import http from "node:http";
import type { Logger } from "../relayer";
import type { Sponsor } from "./sponsor";

const MAX_BODY = 1024;

export function createSponsorServer(sponsor: Sponsor, opts: { allowedOrigins: string[]; log?: Logger; info?: object }) {
  const allowAll = opts.allowedOrigins.includes("*");

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (allowAll) res.setHeader("Access-Control-Allow-Origin", "*");
    else if (origin && opts.allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers });
      res.end(JSON.stringify(body));
    };
    const path = (req.url ?? "/").split("?")[0];

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === "GET" && (path === "/health" || path === "/sponsor")) {
        send(200, { ok: true, ...opts.info, ...(await sponsor.status()) });
        return;
      }
      if (req.method === "POST" && path === "/sponsor") {
        let body: unknown;
        try {
          body = JSON.parse(await readBody(req));
        } catch (err) {
          send(400, { ok: false, error: "BAD_REQUEST", message: (err as Error).message.startsWith("Body") ? (err as Error).message : 'Send JSON like {"address": "0x…"}.' });
          return;
        }
        const result = await sponsor.handle(body);
        const retry = !result.body.ok && result.body.retryAfterS ? { "Retry-After": String(result.body.retryAfterS) } : undefined;
        send(result.status, result.body, retry);
        return;
      }
      send(404, { ok: false, error: "NOT_FOUND", message: "Use POST /sponsor or GET /health." });
    } catch (err) {
      opts.log?.error(`sponsor: unexpected error: ${(err as Error).message}`);
      send(500, { ok: false, error: "SEND_FAILED", message: "Unexpected error. Try again." });
    }
  });
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Body too large"));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
