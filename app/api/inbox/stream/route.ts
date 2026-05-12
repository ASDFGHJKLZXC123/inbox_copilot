import { NextRequest } from "next/server";

import inboxEmitter, { InboxEvent } from "@/lib/inbox-emitter";

export const runtime = "nodejs";

// Keep connections alive with a ping every 25 seconds.
const PING_INTERVAL_MS = 25_000;

export function GET(request: NextRequest): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  function write(chunk: string): void {
    // Fire-and-forget; if the client has already disconnected the abort
    // handler below will close the writer before the next write attempt.
    writer.write(encoder.encode(chunk)).catch(() => undefined);
  }

  function formatSSE(event: string, data: string): string {
    return `event: ${event}\ndata: ${data}\n\n`;
  }

  // Send an initial ping so the browser receives bytes immediately and
  // confirms the connection is open.
  write(formatSSE("ping", JSON.stringify({ ts: Date.now() })));

  // Keep-alive ping on a fixed interval.
  const pingTimer = setInterval(() => {
    write(formatSSE("ping", JSON.stringify({ ts: Date.now() })));
  }, PING_INTERVAL_MS);

  // Forward inbox sync events to this SSE client.
  function onSync(event: InboxEvent): void {
    write(formatSSE("sync", JSON.stringify(event)));
  }

  inboxEmitter.on("sync", onSync);

  // Teardown: invoked when the browser closes the tab/navigates away.
  function cleanup(): void {
    clearInterval(pingTimer);
    inboxEmitter.off("sync", onSync);
    writer.close().catch(() => undefined);
  }

  request.signal.addEventListener("abort", cleanup, { once: true });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
