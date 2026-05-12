"use client";

import { useEffect, useRef } from "react";

const STREAM_URL = "/api/inbox/stream";
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export function useInboxStream(onSync: () => void): void {
  // Hold a stable ref so the effect closure always calls the latest version
  // of the callback without needing it in the dependency array.
  const onSyncRef = useRef<() => void>(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect(): void {
      if (destroyed) {
        return;
      }

      es = new EventSource(STREAM_URL);

      es.addEventListener("sync", () => {
        retryCount = 0; // reset backoff on a successful message
        onSyncRef.current();
      });

      es.addEventListener("open", () => {
        retryCount = 0; // connection established — reset backoff
      });

      es.addEventListener("error", () => {
        if (destroyed) {
          return;
        }

        // Close the broken connection before attempting a reconnect so the
        // browser does not also apply its own automatic reconnection on top.
        es?.close();
        es = null;

        const backoff = Math.min(BASE_BACKOFF_MS * 2 ** retryCount, MAX_BACKOFF_MS);
        retryCount += 1;

        retryTimer = setTimeout(() => {
          retryTimer = null;
          connect();
        }, backoff);
      });
    }

    connect();

    return () => {
      destroyed = true;

      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      es?.close();
      es = null;
    };
  }, []); // intentionally empty — callback changes are handled via the ref
}
