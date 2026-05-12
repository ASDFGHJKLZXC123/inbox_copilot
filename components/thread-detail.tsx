"use client";

import { useMemo } from "react";
import type { Message, Thread, ThreadSummaryResult } from "@/lib/types";
import { SummarySkeletonBlock } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ThreadDetailProps {
  thread: Thread;
  messages: Message[];
  summaryResult: ThreadSummaryResult | null;
  summaryPending: boolean;
}

// Derive a compact participant label from the full address list, memoized in
// the component so repeated renders with the same thread skip the work.
function useParticipantLabel(participants: string[]): string {
  return useMemo(() => participants.join(", "), [participants]);
}

function MessageSkeleton() {
  return (
    <article className="message-card" aria-busy="true" aria-label="Loading message">
      <style>{`
        @keyframes skeleton-pulse {
          0%   { opacity: 1; }
          50%  { opacity: 0.45; }
          100% { opacity: 1; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.6s ease-in-out infinite;
          background: rgba(161, 67, 31, 0.1);
          display: block;
          flex-shrink: 0;
        }
      `}</style>
      <span className="skeleton-pulse" aria-hidden="true" style={{ height: "14px", width: "40%", borderRadius: "6px", marginBottom: "10px" }} />
      <span className="skeleton-pulse" aria-hidden="true" style={{ height: "14px", width: "100%", borderRadius: "6px", marginBottom: "8px" }} />
      <span className="skeleton-pulse" aria-hidden="true" style={{ height: "14px", width: "70%", borderRadius: "6px" }} />
    </article>
  );
}

export function ThreadDetail({
  thread,
  messages,
  summaryResult,
  summaryPending,
}: ThreadDetailProps) {
  const participantLabel = useParticipantLabel(thread.participants);

  return (
    <>
      {/* Participants / status bar */}
      <p className="subtle">
        {participantLabel} · {thread.status.replace("_", " ")}
      </p>
      {thread.waitingOn ? (
        <p className="waiting">Waiting on: {thread.waitingOn}</p>
      ) : null}

      {/* Summary panel */}
      <div className="panel draft-panel">
        <p className="panel-label">Summary</p>
        {summaryPending ? (
          <SummarySkeletonBlock />
        ) : summaryResult ? (
          <>
            {summaryResult.meta.source ? (
              <p className="muted">
                Source:{" "}
                {summaryResult.meta.model
                  ? `${summaryResult.meta.source} (${summaryResult.meta.model})`
                  : summaryResult.meta.source}
              </p>
            ) : null}
            <div className="stack">
              <h3>{summaryResult.summary.headline}</h3>
              <p>{summaryResult.summary.action}</p>
              <ul className="summary-list">
                {summaryResult.summary.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="muted">Generate a short, actionable thread summary.</p>
        )}
      </div>

      {/* Message list */}
      <div className="panel messages-panel">
        <p className="panel-label">Messages</p>
        <div className="stack">
          {messages.length === 0 ? (
            <>
              <MessageSkeleton />
              <MessageSkeleton />
            </>
          ) : (
            messages.map((message) => (
              <article key={message.id} className="message-card">
                <div className="message-header">
                  <strong>{message.from}</strong>
                  <span className="muted">
                    {new Date(message.receivedAt).toLocaleString()}
                  </span>
                </div>
                <p>{message.snippet}</p>
                <p className="muted">{message.bodyPreview}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/** Shown in the detail pane when no thread has been selected yet. */
export function NoThreadSelected() {
  return (
    <EmptyState
      icon="←"
      title="Select a thread to view details"
      description="Choose a thread from the list on the left to read messages, generate a summary, or draft a reply."
    />
  );
}
