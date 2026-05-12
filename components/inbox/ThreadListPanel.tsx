"use client";

import { ArrowsClockwise, Faders, MagnifyingGlass, Sparkle } from "@phosphor-icons/react";

export interface ThreadItem {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  isUnread?: boolean;
  isSelected?: boolean;
  tags?: Array<{ label: string; type: "reminder" | "ai" | "label" }>;
  attachments?: number;
  draftPrefix?: boolean;
}

interface ThreadListPanelProps {
  threads: ThreadItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  activeFilter: "all" | "unread" | "ai";
  onFilterChange: (f: "all" | "unread" | "ai") => void;
}

function TagBadge({ tag }: { tag: { label: string; type: "reminder" | "ai" | "label" } }) {
  if (tag.type === "reminder") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600 border border-orange-100">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeLinecap="round" d="M12 6v6l4 2" strokeWidth="2" />
        </svg>
        {tag.label}
      </span>
    );
  }
  if (tag.type === "ai") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-ai-50 text-ai-700 border border-ai-100">
        <Sparkle size={10} />
        {tag.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
      {tag.label}
    </span>
  );
}

export function ThreadListPanel({
  threads,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: ThreadListPanelProps) {
  const filtered = threads.filter((t) => {
    if (activeFilter === "unread") return t.isUnread;
    if (activeFilter === "ai") return t.tags?.some((tag) => tag.type === "ai");
    return true;
  });

  return (
    <div className="w-[380px] bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-10 font-sans">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-slate-900">Inbox</h1>
          <div className="flex gap-2">
            <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" title="Filter">
              <Faders size={18} />
            </button>
            <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" title="Refresh">
              <ArrowsClockwise size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlass size={16} className="text-slate-400 group-focus-within:text-brand-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-12 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
            placeholder="Search emails, AI summaries, people..."
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">
              ⌘K
            </span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-medium text-slate-500">
        <div className="flex items-center gap-4">
          {(["all", "unread", "ai"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`transition-colors flex items-center gap-1 ${
                activeFilter === f ? "text-slate-900 font-semibold" : "hover:text-slate-900"
              }`}
            >
              {f === "ai" && <Sparkle size={12} className="text-ai-600" />}
              {f === "all" ? "All" : f === "unread" ? "Unread" : "AI Tagged"}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto inbox-scroll">
        {filtered.map((thread) => {
          const isSelected = thread.id === selectedId;

          if (isSelected) {
            return (
              <div
                key={thread.id}
                onClick={() => onSelect(thread.id)}
                className="relative px-4 py-4 border-b border-brand-200 bg-brand-50 cursor-pointer transition-colors border-l-4 border-l-brand-500"
              >
                <div className="pl-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-slate-900 truncate pr-2">{thread.sender}</span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{thread.time}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900 mb-1 truncate">{thread.subject}</div>
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{thread.preview}</p>
                  {thread.tags && thread.tags.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {thread.tags.map((tag, i) => <TagBadge key={i} tag={tag} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={thread.id}
              onClick={() => onSelect(thread.id)}
              className="relative px-4 py-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              {thread.isUnread && (
                <div className="absolute left-1.5 top-5 w-2 h-2 rounded-full bg-brand-500" />
              )}
              <div className={thread.isUnread ? "pl-2" : "pl-2"}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-sm truncate pr-2 ${thread.isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                    {thread.sender}
                  </span>
                  <span className={`text-xs whitespace-nowrap ${thread.isUnread ? "font-medium text-brand-600" : "text-slate-500"}`}>
                    {thread.time}
                  </span>
                </div>
                <div className={`text-sm mb-1 truncate ${thread.isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>
                  {thread.subject}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                  {thread.draftPrefix && <span className="text-red-500 font-medium">[Draft] </span>}
                  {thread.preview}
                </p>
                {(thread.tags?.length || thread.attachments) ? (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {thread.tags?.map((tag, i) => <TagBadge key={i} tag={tag} />)}
                    {thread.attachments && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                        📎 {thread.attachments}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
