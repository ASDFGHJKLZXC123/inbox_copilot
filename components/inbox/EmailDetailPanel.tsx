"use client";

import {
  Archive,
  CaretLeft,
  CaretRight,
  Clock,
  EnvelopeSimple,
  Tag,
  Trash,
} from "@phosphor-icons/react";

import { CopilotSummary } from "./CopilotSummary";
import { EmailMessage, type EmailMessageData } from "./EmailMessage";
import { ReplyComposer } from "./ReplyComposer";

export interface EmailDetailData {
  subject: string;
  label?: string;
  aiSummary?: {
    context: string;
    bullets: string[];
    suggestedActions: Array<{ label: string; icon: "calendar" | "draft" }>;
  };
  messages: EmailMessageData[];
  draftBody?: string;
  position: { current: number; total: number };
}

interface EmailDetailPanelProps {
  detail: EmailDetailData;
}

export function EmailDetailPanel({ detail }: EmailDetailPanelProps) {
  return (
    <main className="flex-1 flex flex-col bg-white min-w-0 h-full relative font-sans">
      {/* Toolbar header */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-white z-10">
        <div className="flex items-center gap-2">
          {/* Action buttons */}
          <div className="flex bg-slate-50 border border-slate-200 rounded-md p-1">
            <button className="p-1.5 text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 rounded transition-all" title="Archive">
              <Archive size={18} />
            </button>
            <button className="p-1.5 text-slate-600 hover:bg-white hover:shadow-sm hover:text-red-600 rounded transition-all" title="Delete">
              <Trash size={18} />
            </button>
            <button className="p-1.5 text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 rounded transition-all" title="Mark Unread">
              <EnvelopeSimple size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <Clock size={18} className="text-orange-500" />
            Snooze
          </button>

          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <Tag size={18} />
            Label
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {detail.position.current} of {detail.position.total}
          </span>
          <div className="flex gap-1">
            <button className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors">
              <CaretLeft size={18} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors">
              <CaretRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto inbox-scroll bg-slate-50/30 pb-[220px]">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
          {/* Subject + label */}
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-slate-900">{detail.subject}</h2>
            {detail.label && (
              <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-100 whitespace-nowrap ml-4">
                {detail.label}
              </span>
            )}
          </div>

          {/* AI summary card */}
          {detail.aiSummary && (
            <CopilotSummary
              threadContext={detail.aiSummary.context}
              bullets={detail.aiSummary.bullets}
              status=""
              suggestedActions={detail.aiSummary.suggestedActions}
            />
          )}

          {/* Email messages */}
          <div className="space-y-6">
            {detail.messages.map((msg) => (
              <EmailMessage key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      </div>

      {/* Reply composer — fixed to bottom */}
      <ReplyComposer
        placeholder={`Reply to ${detail.messages[detail.messages.length - 1]?.senderName ?? ""}...`}
        initialDraft={detail.draftBody}
        recipientNames="David Lee, Sarah Chen"
      />
    </main>
  );
}
