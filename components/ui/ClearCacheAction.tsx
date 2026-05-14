"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { api } from "@/lib/ui/api";

import * as I from "./icons";

export interface ClearCacheDialogProps {
  open: boolean;
  onClose: () => void;
  onError?: (message: string) => void;
}

export function ClearCacheDialog({ open, onClose, onError }: ClearCacheDialogProps) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const ok = text.trim().toLowerCase() === "delete";

  useEffect(() => {
    if (!open) return;
    setText("");
    setPending(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  const handleConfirm = async () => {
    setPending(true);
    try {
      await api.clearCache();
      await signOut({ redirect: false });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear cache";
      onError?.(message);
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-6 overlay-in"
      style={{ background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="dialog-in w-[460px] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300 mb-3">
            <I.Trash size={15} />
          </div>
          <h2 className="text-[15px] font-semibold text-slate-100 mb-1">Clear local cache?</h2>
          <p className="text-[12.5px] text-slate-400 leading-relaxed">
            This wipes all locally-cached threads, messages, drafts, and reminders, and signs you out of this device. Your Gmail account is not affected — re-syncing will repopulate everything.
          </p>
        </div>

        <div className="px-5 pb-4">
          <label className="text-[11px] uppercase tracking-wide text-slate-400 font-medium block mb-1.5">
            Type <span className="font-mono text-rose-300">delete</span> to confirm
          </label>
          <input
            autoFocus
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="delete"
            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-md text-[13px] text-slate-100 placeholder:text-slate-700 focus:border-rose-500/50 focus-ring font-mono"
          />
        </div>

        <div className="px-5 py-3 flex items-center gap-2 justify-end border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={onClose}
            disabled={pending}
            className="h-8 px-3 rounded-md text-[12.5px] text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!ok || pending}
            className="h-8 px-3.5 rounded-md bg-rose-500 hover:bg-rose-400 disabled:bg-rose-900/50 disabled:text-rose-300/60 disabled:cursor-not-allowed text-white text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            {pending && <I.Refresh size={12} className="spin" />}
            Clear &amp; sign out
          </button>
        </div>
      </div>
    </div>
  );
}
