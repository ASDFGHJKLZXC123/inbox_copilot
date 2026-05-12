// Hooks mirror the spec: useFeatureSeqRef, useToastQueue, useGlobalKeymap.
const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

function useFeatureSeqRef() {
  const seq = useRef(0);
  return {
    next: () => ++seq.current,
    current: () => seq.current,
    matches: (n) => n === seq.current,
  };
}

let toastIdCounter = 1;
function useToastQueue({ defaultDurationMs = 5000 } = {}) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const push = useCallback((opts) => {
    const id = opts.id || `toast_${toastIdCounter++}`;
    const toast = {
      id,
      message: opts.message,
      variant: opts.variant || 'info',
      retry: opts.retry,
      durationMs: opts.durationMs ?? defaultDurationMs,
    };
    setToasts((prev) => {
      const existing = prev.findIndex((t) => t.id === id);
      if (existing >= 0) {
        const next = [...prev];
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
  }, [defaultDurationMs, dismiss]);

  return { toasts, push, dismiss };
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest && el.closest('[role="dialog"]')) return true;
  return false;
}

function useGlobalKeymap(map) {
  useEffect(() => {
    function onKey(e) {
      if (isTypingTarget(e.target)) return;
      const handler = map[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [map]);
}

// Simulated network delay
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

Object.assign(window, { useFeatureSeqRef, useToastQueue, useGlobalKeymap, isTypingTarget, sleep });
