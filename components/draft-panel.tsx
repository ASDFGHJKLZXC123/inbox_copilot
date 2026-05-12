"use client";

import { useState } from "react";
import type { DraftOptions, DraftReply, DraftReplyResult, Thread } from "@/lib/types";
import { DraftSkeletonBlock } from "@/components/ui/skeleton";

interface DraftPanelProps {
  thread: Thread;
  draftResult: DraftReplyResult | null;
  draftPending: boolean;
  onRevise: (instruction: string) => void;
  onToneChange: (tone: DraftOptions["tone"]) => void;
  onDraftBodyChange: (body: string) => void;
  onCopy: () => void;
  tone: DraftOptions["tone"];
  askClarifyingQuestion: boolean;
  onAskClarifyingQuestionChange: (value: boolean) => void;
}

export function DraftPanel({
  thread: _thread,
  draftResult,
  draftPending,
  onRevise,
  onToneChange,
  onDraftBodyChange,
  onCopy,
  tone,
  askClarifyingQuestion,
  onAskClarifyingQuestionChange,
}: DraftPanelProps) {
  // Keep revise input as purely local UI state — it does not need to live in
  // the parent because it is never read outside this component.
  const [reviseInstruction, setReviseInstruction] = useState("");

  function handleRevise() {
    if (!reviseInstruction.trim()) return;
    onRevise(reviseInstruction);
    setReviseInstruction("");
  }

  const draft: DraftReply | null = draftResult?.draft ?? null;

  return (
    <div className="panel">
      <p className="panel-label">Draft</p>
      {draftResult && !draftPending ? (
        <p className="muted">
          Source:{" "}
          {draftResult.meta.model
            ? `${draftResult.meta.source} (${draftResult.meta.model})`
            : draftResult.meta.source}
        </p>
      ) : null}

      {/* Tone selector + options row */}
      <div className="inline-actions">
        <select
          className="input"
          value={tone}
          onChange={(e) => onToneChange(e.target.value as DraftOptions["tone"])}
          disabled={draftPending}
        >
          <option value="concise">Concise</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
        </select>
        <label className="toggle">
          <input
            type="checkbox"
            checked={askClarifyingQuestion}
            onChange={(e) => onAskClarifyingQuestionChange(e.target.checked)}
            disabled={draftPending}
          />
          Ask clarifying question
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={onCopy}
          disabled={draftPending || !draft}
        >
          Copy Draft
        </button>
      </div>

      {/* Revise row */}
      <div className="stack">
        <input
          className="input"
          value={reviseInstruction}
          onChange={(e) => setReviseInstruction(e.target.value)}
          placeholder="Tell the AI how to edit this draft"
          disabled={draftPending || !draft}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRevise();
          }}
        />
        <button
          className="secondary-button"
          type="button"
          onClick={handleRevise}
          disabled={draftPending || !draft || !reviseInstruction.trim()}
        >
          Apply Edit
        </button>
      </div>

      {/* Draft body */}
      {draftPending ? (
        <DraftSkeletonBlock />
      ) : draft ? (
        <textarea
          className="draft-box draft-editor"
          value={draft.body}
          onChange={(e) => onDraftBodyChange(e.target.value)}
        />
      ) : (
        <p className="muted">Generate a reply draft.</p>
      )}
    </div>
  );
}
