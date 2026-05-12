"use client";

import { useEffect, useState, type ComponentType } from "react";

import type { CopilotMeta, DraftReply, DraftReplyResult, Message, ThreadSummaryResult } from "@/lib/types";
import type { Tone } from "@/lib/types-ui";
import { api } from "@/lib/ui/api";
import { useFeatureSeqRef } from "@/lib/ui/hooks";
import * as I from "@/components/ui/icons";

export interface AiThreadPanelProps {
  selectedThreadId: string | null;
  threadMessages: Message[];
  replyHasUserContent: boolean;
  onUseDraft: (draft: DraftReply) => void;
  onError: (message: string) => void;
}

type View = "idle" | "summary" | "draft";

export function AiThreadPanel({
  selectedThreadId,
  threadMessages,
  replyHasUserContent,
  onUseDraft,
  onError,
}: AiThreadPanelProps) {
  void threadMessages; // present for parity; the API resolves on threadId
  const [open, setOpen] = useState(true);
  const [view, setView] = useState<View>("idle");
  const [summaryResult, setSummaryResult] = useState<ThreadSummaryResult | null>(null);
  const [draftResult, setDraftResult] = useState<DraftReplyResult | null>(null);
  const [tone, setTone] = useState<Tone>("concise");
  const [askClarifyingQuestion, setAskClarifyingQuestion] = useState(false);
  const [reviseInstruction, setReviseInstruction] = useState("");
  const [summaryPending, setSummaryPending] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const [revisePending, setRevisePending] = useState(false);
  const seq = useFeatureSeqRef();

  // Clear panel state on thread change
  useEffect(() => {
    setSummaryResult(null);
    setDraftResult(null);
    setReviseInstruction("");
    setSummaryPending(false);
    setDraftPending(false);
    setRevisePending(false);
    setView("idle");
  }, [selectedThreadId]);

  const disabled = !selectedThreadId;

  const handleSummarize = async () => {
    if (!selectedThreadId) return;
    const myReq = seq.next();
    setSummaryPending(true);
    setView("summary");
    setSummaryResult(null);
    try {
      const result = await api.summarizeThread(selectedThreadId);
      if (!seq.matches(myReq)) return;
      setSummaryResult(result);
    } catch (err) {
      if (!seq.matches(myReq)) return;
      const message = err instanceof Error ? err.message : "Failed to summarize";
      onError(message);
      setView("idle");
    } finally {
      if (seq.matches(myReq)) setSummaryPending(false);
    }
  };

  const handleDraft = async () => {
    if (!selectedThreadId) return;
    const myReq = seq.next();
    setDraftPending(true);
    setView("draft");
    setDraftResult(null);
    try {
      const result = await api.draftReply(selectedThreadId, {
        tone,
        askClarifyingQuestion,
      });
      if (!seq.matches(myReq)) return;
      setDraftResult(result);
    } catch (err) {
      if (!seq.matches(myReq)) return;
      const message = err instanceof Error ? err.message : "Failed to draft reply";
      onError(message);
      setView("idle");
    } finally {
      if (seq.matches(myReq)) setDraftPending(false);
    }
  };

  const handleRevise = async () => {
    if (!selectedThreadId || !draftResult || !reviseInstruction.trim()) return;
    const myReq = seq.next();
    setRevisePending(true);
    try {
      const result = await api.reviseDraft(selectedThreadId, {
        draft: draftResult.draft,
        instruction: reviseInstruction.trim(),
      });
      if (!seq.matches(myReq)) return;
      setDraftResult(result);
      setReviseInstruction("");
    } catch (err) {
      if (!seq.matches(myReq)) return;
      const message = err instanceof Error ? err.message : "Failed to revise draft";
      onError(message);
    } finally {
      if (seq.matches(myReq)) setRevisePending(false);
    }
  };

  const handleUseDraft = () => {
    if (!draftResult) return;
    if (replyHasUserContent) {
      const ok = window.confirm("Replace your current reply with this draft?");
      if (!ok) return;
    }
    onUseDraft(draftResult.draft);
  };

  return (
    <div className="mx-6 my-3 rounded-lg border border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-900/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-slate-900/40 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
          <I.Sparkles size={12} className="sparkle" />
        </div>
        <span className="text-[12.5px] font-semibold text-slate-100">Copilot</span>
        <span className="text-[11.5px] text-slate-500">·</span>
        <span className="text-[11.5px] text-slate-400">Summarize, draft, revise</span>
        <span className="ml-auto" />
        <I.ChevronDown
          size={13}
          className={"text-slate-500 transition-transform " + (open ? "" : "-rotate-90")}
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5">
          {/* Action row */}
          <div className="flex items-center gap-2 mb-3">
            <AiAction
              icon={I.Sparkles}
              label="Summarize thread"
              onClick={handleSummarize}
              loading={summaryPending}
              disabled={disabled}
            />
            <AiAction
              icon={I.Wand}
              label="Draft reply"
              onClick={handleDraft}
              loading={draftPending}
              disabled={disabled}
            />
            <div className="ml-auto flex items-center gap-2">
              <ToneSelector value={tone} onChange={setTone} />
              <ClarifyToggle value={askClarifyingQuestion} onChange={setAskClarifyingQuestion} />
            </div>
          </div>

          {/* Result area */}
          {view === "summary" &&
            (summaryPending ? (
              <PendingBlock label="Reading thread, distilling key points…" />
            ) : (
              summaryResult && <SummaryResult result={summaryResult} />
            ))}

          {view === "draft" &&
            (draftPending ? (
              <PendingBlock label="Drafting reply…" />
            ) : (
              draftResult && (
                <DraftResultBlock
                  result={draftResult}
                  reviseInstruction={reviseInstruction}
                  setReviseInstruction={setReviseInstruction}
                  onRevise={handleRevise}
                  revisePending={revisePending}
                  onUseDraft={handleUseDraft}
                />
              )
            ))}

          {view === "idle" && (
            <div className="px-1 py-1 text-[11.5px] text-slate-500 leading-relaxed">
              Pick an action above. Copilot reads only this thread; it never sees other mail.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AiAction({
  icon: Icon,
  label,
  onClick,
  loading,
  disabled,
}: {
  icon: ComponentType<I.IconProps>;
  label: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={
        "h-8 px-3 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors " +
        (disabled
          ? "bg-slate-900/40 text-slate-600 cursor-not-allowed"
          : "bg-slate-100 text-slate-950 hover:bg-white")
      }
    >
      {loading ? <I.Refresh size={12} className="spin" /> : <Icon size={12} strokeWidth={2.1} />}
      <span>{label}</span>
    </button>
  );
}

function ToneSelector({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  const tones: Tone[] = ["concise", "friendly", "formal"];
  return (
    <div className="inline-flex items-center bg-slate-900/80 border border-slate-800 rounded-md p-0.5">
      {tones.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={
            "h-6 px-2 rounded text-[10.5px] font-medium capitalize transition-colors " +
            (value === t ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300")
          }
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ClarifyToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      title="Append a clarifying question to the draft"
      className={
        "h-6 px-2 inline-flex items-center gap-1.5 rounded-md text-[10.5px] font-medium border transition-colors " +
        (value
          ? "bg-sky-400/10 border-sky-400/30 text-sky-200"
          : "bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300")
      }
    >
      <span
        className={
          "w-3 h-3 rounded-sm border flex items-center justify-center " +
          (value ? "bg-sky-400 border-sky-400" : "border-slate-700")
        }
      >
        {value && <I.Check size={9} strokeWidth={3} className="text-slate-950" />}
      </span>
      Ask clarifying Q
    </button>
  );
}

function PendingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-md bg-slate-900/60 border border-slate-800 p-3.5 space-y-2">
      <div className="flex items-center gap-2 text-[11.5px] text-slate-400">
        <I.Refresh size={11} className="spin text-sky-300" />
        <span>{label}</span>
      </div>
      <div className="skeleton h-2.5 w-full" />
      <div className="skeleton h-2.5 w-[88%]" />
      <div className="skeleton h-2.5 w-[72%]" />
    </div>
  );
}

function SummaryResult({ result }: { result: ThreadSummaryResult }) {
  const { summary, meta } = result;
  return (
    <div className="rounded-md bg-slate-900/60 border border-slate-800 p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <SourceBadge meta={meta} />
      </div>
      <div className="text-[13px] font-medium text-slate-100 leading-snug mb-2">
        {summary.headline}
      </div>
      <ul className="space-y-1.5 mb-3">
        {summary.bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-[12.5px] text-slate-300 leading-relaxed">
            <span className="text-slate-600 mt-1">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="pt-2.5 border-t border-slate-800 flex items-start gap-2">
        <span className="mt-0.5 inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-semibold tracking-wider uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20">
          Action
        </span>
        <span className="text-[12.5px] text-slate-200 leading-relaxed">{summary.action}</span>
      </div>
    </div>
  );
}

function DraftResultBlock({
  result,
  reviseInstruction,
  setReviseInstruction,
  onRevise,
  revisePending,
  onUseDraft,
}: {
  result: DraftReplyResult;
  reviseInstruction: string;
  setReviseInstruction: (s: string) => void;
  onRevise: () => void;
  revisePending: boolean;
  onUseDraft: () => void;
}) {
  const { draft, meta } = result;
  return (
    <div className="rounded-md bg-slate-900/60 border border-slate-800 overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
        <SourceBadge meta={meta} />
        <span className="ml-auto text-[10.5px] text-slate-500">Draft preview</span>
      </div>
      <div className="px-4 pb-3">
        <div className="text-[12px] text-slate-500 mb-1">Subject</div>
        <div className="text-[13px] text-slate-100 font-medium mb-3">{draft.subject}</div>
        <div className="text-[12px] text-slate-500 mb-1">Body</div>
        <div className="text-[13px] text-slate-200 whitespace-pre-wrap leading-[1.65] font-normal max-h-60 overflow-y-auto pr-2">
          {draft.body}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <I.Wand size={11} />
          <span>Revise with instruction</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={reviseInstruction}
            onChange={(e) => setReviseInstruction(e.target.value)}
            placeholder='e.g. "Make it shorter" or "Add a note about vesting"'
            className="flex-1 h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-md text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-slate-700 focus-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter" && reviseInstruction.trim()) onRevise();
            }}
          />
          <button
            onClick={onRevise}
            disabled={!reviseInstruction.trim() || revisePending}
            className="h-8 px-3 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11.5px] font-medium text-slate-100 flex items-center gap-1.5 transition-colors"
          >
            {revisePending && <I.Refresh size={11} className="spin" />}
            Revise
          </button>
          <button
            onClick={onUseDraft}
            className="h-8 px-3 rounded-md bg-sky-400 hover:bg-sky-300 text-slate-950 text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            <I.Check size={12} strokeWidth={2.6} />
            Use draft
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ meta }: { meta: CopilotMeta }) {
  if (meta.source === "fallback") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
        <I.Bell size={9} />
        Heuristic fallback — no AI key
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-sky-400/10 text-sky-300 border border-sky-400/20">
      <I.Sparkles size={9} />
      {meta.source}
      {meta.model ? ` · ${meta.model}` : ""}
    </span>
  );
}
