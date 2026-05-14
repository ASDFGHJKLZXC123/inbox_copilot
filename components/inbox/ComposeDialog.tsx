"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import type { ComposeMode } from "@/lib/types-ui";
import * as I from "@/components/ui/icons";

export interface ComposeDialogInitial {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}

export interface ComposePayload {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}

export interface ComposeDialogProps {
  mode: ComposeMode;
  initial?: ComposeDialogInitial;
  onClose: () => void;
  onSend: (payload: ComposePayload) => void | Promise<void>;
  onError: (message: string) => void;
}

export function ComposeDialog({ mode, initial, onClose, onSend, onError }: ComposeDialogProps) {
  const [to, setTo] = useState(initial?.to ?? "");
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [bcc, setBcc] = useState(initial?.bcc ?? "");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  // Per-field ids so the rendered FieldRow labels can target real inputs via
  // htmlFor. useId returns a stable id-per-mount that's unique even when two
  // ComposeDialog instances mount at once.
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const [sending, setSending] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus
  useEffect(() => {
    const id = window.setTimeout(() => {
      const target =
        mode === "forward"
          ? dialogRef.current?.querySelector("textarea")
          : dialogRef.current?.querySelector('input[name="to"]');
      (target as HTMLElement | null)?.focus();
    }, 50);
    return () => window.clearTimeout(id);
  }, [mode]);

  const recipientsValid = () => /\S+@\S+\.\S+/.test(to);

  const tryClose = () => {
    if (body.trim().length > 0) {
      const ok = window.confirm("Discard this message?");
      if (!ok) return;
    }
    onClose();
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend({
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        cc: cc ? [cc] : [],
        bcc: bcc ? [bcc] : [],
        subject,
        body,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      onError(message);
    } finally {
      setSending(false);
    }
  };

  // Esc to close, Cmd+Enter to send
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        tryClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (recipientsValid()) void handleSend();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-6 overlay-in"
      style={{ background: "rgba(2, 6, 23, 0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "forward" ? "Forward message" : "New message"}
        className="dialog-in w-[640px] max-h-[88vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
      >
        <div className="h-11 px-4 flex items-center gap-2 border-b border-slate-800">
          <I.Send size={13} className="text-slate-400" />
          <span className="text-[13px] font-semibold text-slate-100">
            {mode === "forward" ? "Forward" : "New message"}
          </span>
          <button
            onClick={tryClose}
            className="ml-auto text-slate-500 hover:text-slate-200"
            aria-label="Close"
          >
            <I.X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FieldRow htmlFor={toId} label="To">
            <input
              id={toId}
              name="to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
              className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
            {!showCcBcc && (
              <button
                onClick={() => setShowCcBcc(true)}
                className="text-[11px] text-slate-500 hover:text-slate-300 focus-ring rounded"
              >
                Cc/Bcc
              </button>
            )}
          </FieldRow>
          {showCcBcc && (
            <>
              <FieldRow htmlFor={ccId} label="Cc">
                <input
                  id={ccId}
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
              </FieldRow>
              <FieldRow htmlFor={bccId} label="Bcc">
                <input
                  id={bccId}
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
              </FieldRow>
            </>
          )}
          <FieldRow htmlFor={subjectId} label="Subject">
            <input
              id={subjectId}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
          </FieldRow>
          <label htmlFor={bodyId} className="sr-only">
            Message body
          </label>
          <textarea
            id={bodyId}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={12}
            className="w-full px-4 py-3.5 bg-transparent text-[13.5px] text-slate-100 placeholder:text-slate-600 leading-[1.7] resize-y focus:outline-none focus:bg-slate-950/30 min-h-[240px]"
            style={{ fontFeatureSettings: '"ss01"' }}
          />
        </div>

        <div className="px-3 py-2.5 flex items-center gap-2 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={() => void handleSend()}
            disabled={!recipientsValid() || sending}
            className="h-8 px-3.5 rounded-md bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            {sending ? (
              <I.Refresh size={12} className="spin" />
            ) : (
              <I.Send size={12} strokeWidth={2.2} />
            )}
            {sending ? "Sending…" : "Send"}
          </button>
          <kbd>⌘</kbd>
          <span className="text-[10.5px] text-slate-500 -ml-1">+</span>
          <kbd>↵</kbd>
          <span className="text-[10.5px] text-slate-500">to send</span>
          <div className="ml-auto flex items-center gap-1.5 text-slate-500">
            <button className="hover:text-slate-200 transition-colors p-1" title="Attach">
              <I.Paperclip size={13} />
            </button>
            <button
              onClick={tryClose}
              className="hover:text-slate-200 transition-colors text-[11.5px] px-2"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: ReactNode;
}) {
  // focus-within lights the row so keyboard users see which field is active,
  // since the inputs themselves are transparent and have focus:outline-none.
  return (
    <div className="h-10 px-4 flex items-center gap-3 border-b border-slate-800/60 focus-within:bg-slate-950/40 transition-colors">
      <label htmlFor={htmlFor} className="text-[11.5px] text-slate-500 w-12 cursor-text">
        {label}
      </label>
      {children}
    </div>
  );
}
