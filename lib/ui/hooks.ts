import { useCallback, useEffect, useRef, useState } from "react";

import type { Toast, ToastPushOptions } from "@/lib/types-ui";

export interface FeatureSeqRef {
  next: () => number;
  current: () => number;
  matches: (n: number) => boolean;
}

export function useFeatureSeqRef(): FeatureSeqRef {
  const seq = useRef(0);
  return {
    next: () => ++seq.current,
    current: () => seq.current,
    matches: (n: number) => n === seq.current,
  };
}

export interface UseToastQueueOptions {
  defaultDurationMs?: number;
}

export interface UseToastQueueResult {
  toasts: Toast[];
  push: (opts: ToastPushOptions) => string;
  dismiss: (id: string) => void;
}

let toastIdCounter = 1;

export function useToastQueue({ defaultDurationMs = 5000 }: UseToastQueueOptions = {}): UseToastQueueResult {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (opts: ToastPushOptions): string => {
      const id = opts.id ?? `toast_${toastIdCounter++}`;
      const toast: Toast = {
        id,
        message: opts.message,
        variant: opts.variant ?? "info",
        durationMs: opts.durationMs ?? defaultDurationMs,
        retry: opts.retry,
      };
      setToasts((prev) => {
        const existing = prev.findIndex((t) => t.id === id);
        if (existing >= 0) {
          const next = prev.slice();
          next[existing] = toast;
          return next;
        }
        return [...prev, toast];
      });
      const existingTimer = timersRef.current.get(id);
      if (existingTimer) clearTimeout(existingTimer);
      if (toast.durationMs > 0) {
        const t = setTimeout(() => dismiss(id), toast.durationMs);
        timersRef.current.set(id, t);
      }
      return id;
    },
    [defaultDurationMs, dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}

export type KeymapHandler = (e: KeyboardEvent) => void;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (el.closest?.('[role="dialog"]')) return true;
  return false;
}

export function useGlobalKeymap(map: Record<string, KeymapHandler>): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const handler = map[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [map]);
}
