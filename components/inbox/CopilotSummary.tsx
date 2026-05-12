"use client";

import { CalendarPlus, Copy, MagicWand, PencilSimple, Sparkle, ThumbsDown, ThumbsUp } from "@phosphor-icons/react";

interface CopilotSummaryProps {
  threadContext: string;
  bullets: string[];
  status: string;
  suggestedActions: Array<{ label: string; icon: "calendar" | "draft" }>;
}

export function CopilotSummary({ threadContext, bullets, status, suggestedActions }: CopilotSummaryProps) {
  return (
    <div className="bg-gradient-to-br from-ai-50 to-white border border-ai-200 rounded-xl shadow-sm overflow-hidden relative">
      {/* Watermark */}
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkle size={64} weight="fill" className="text-ai-600" />
      </div>

      <div className="p-5 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-ai-700 font-semibold text-sm">
            <MagicWand size={20} weight="fill" />
            Copilot Summary
          </div>
          <div className="flex gap-2">
            <button className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
              <ThumbsUp size={16} />
            </button>
            <button className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
              <ThumbsDown size={16} />
            </button>
            <button className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
              <Copy size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <strong>Thread context:</strong> {threadContext}
          </p>
          <ul className="space-y-2 list-disc pl-5 marker:text-ai-400">
            {bullets.map((bullet, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: bullet }} />
            ))}
          </ul>
        </div>

        {/* Suggested actions */}
        <div className="mt-4 pt-4 border-t border-ai-100 flex gap-2 flex-wrap items-center">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider self-center mr-2">
            Suggested Actions:
          </span>
          {suggestedActions.map(({ label, icon }, i) => (
            <button
              key={i}
              className="px-3 py-1.5 bg-white border border-ai-200 text-ai-700 text-sm font-medium rounded-md shadow-sm hover:bg-ai-50 transition-colors flex items-center gap-1.5"
            >
              {icon === "calendar" ? <CalendarPlus size={14} /> : <PencilSimple size={14} />}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
