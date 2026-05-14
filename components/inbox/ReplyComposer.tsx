"use client";

import { useEffect, useRef } from "react";

import * as I from "@/components/ui/icons";

export interface ReplyComposerProps {
  recipientLabel: string;
  body: string;
  setBody: (b: string) => void;
  onDiscard: () => void;
  onSend: () => Promise<void> | void;
  onError: (message: string) => void;
  sending: boolean;
}

export function ReplyComposer({
  recipientLabel,
  body,
  setBody,
  onDiscard,
  onSend,
  onError,
  sending,
}: ReplyComposerProps) {
  void onError; // present for parity; surface failures via parent
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const tryDiscard = () => {
    if (body.trim().length > 0) {
      const ok = window.confirm("Discard this reply?");
      if (!ok) return;
    }
    onDiscard();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (body.trim()) void onSend();
    } else if (e.key === "Escape") {
      e.preventDefault();
      tryDiscard();
    }
  };

  return (
    <div className="mx-6 mb-6 rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-slate-800/60">
        <I.Reply size={12} className="text-slate-400" />
        <span className="text-[11.5px] text-slate-400">Reply to</span>
        <span className="text-[12px] text-slate-200 font-medium">{recipientLabel}</span>
        <button
          onClick={tryDiscard}
          className="ml-auto text-slate-400 hover:text-slate-300"
          aria-label="Discard reply"
        >
          <I.X size={14} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a reply…"
        rows={6}
        className="w-full px-4 py-3 bg-transparent text-[13.5px] text-slate-100 placeholder:text-slate-600 leading-[1.7] resize-y focus:outline-none min-h-[120px] max-h-[400px]"
        style={{ fontFeatureSettings: '"ss01"' }}
      />
      <div className="px-3 py-2.5 flex items-center gap-2 border-t border-slate-800/60 bg-slate-950/40">
        <button
          onClick={() => void onSend()}
          disabled={!body.trim() || sending}
          className="h-8 px-3.5 rounded-md bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors"
        >
          {sending ? <I.Refresh size={12} className="spin" /> : <I.Send size={12} strokeWidth={2.2} />}
          {sending ? "Sending…" : "Send"}
        </button>
        <kbd>⌘</kbd>
        <span className="text-[10.5px] text-slate-400 -ml-1">+</span>
        <kbd>↵</kbd>
        <span className="text-[10.5px] text-slate-400">to send</span>
        <div className="ml-auto flex items-center gap-1.5 text-slate-400">
          <button className="hover:text-slate-200 transition-colors p-1" title="Attach">
            <I.Paperclip size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
