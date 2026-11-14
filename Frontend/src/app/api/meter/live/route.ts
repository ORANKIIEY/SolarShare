// Server-sent events: pushes the meter's live preview to the browser the
// moment it arrives (about every 2 s). Same origin, so no CSP change needed.
import { latestLive, liveConnected, onLive, type LiveSample } from "@/lib/server/liveMeter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const enc = new TextEncoder();
  let cleanup = () => undefined as void;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const sample = (s: LiveSample) => send("sample", s);

      send("hello", { connected: liveConnected() });
      const last = latestLive();
      if (last) sample(last);

      const off = onLive(sample);
      // Keep proxies from closing an idle stream, and report the broker link.
      const beat = setInterval(() => send("status", { connected: liveConnected() }), 10_000);

      cleanup = () => {
        off();
        clearInterval(beat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
