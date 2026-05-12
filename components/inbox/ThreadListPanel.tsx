"use client";

import type { ReactNode, RefObject } from "react";

import type { NavId, ThreadCard } from "@/lib/types-ui";
import * as I from "@/components/ui/icons";

import { nameOf, smartTimestamp } from "./helpers";

export interface ThreadListPanelProps {
  cards: ThreadCard[];
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string) => void;
  activeFilter: "all" | "unread";
  setActiveFilter: (f: "all" | "unread") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  syncing: boolean;
  onRefresh: () => void;
  isSearchMode: boolean;
  hasActiveReminder: (threadId: string) => boolean;
  activeNav: NavId;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const NAV_LABELS: Record<NavId, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  archive: "Archive",
  trash: "Trash",
};

export function ThreadListPanel({
  cards,
  selectedThreadId,
  setSelectedThreadId,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  syncing,
  onRefresh,
  isSearchMode,
  hasActiveReminder,
  activeNav,
  searchInputRef,
}: ThreadListPanelProps) {
  const folderLabel = NAV_LABELS[activeNav] ?? "Inbox";
  const totalUnread = cards.reduce((s, c) => s + c.unreadCount, 0);

  const filtered = activeFilter === "unread" && !isSearchMode
    ? cards.filter((c) => c.unreadCount > 0)
    : cards;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-800/80">
        <h2 className="text-[14px] font-semibold text-slate-100 flex items-baseline gap-2">
          {folderLabel}
          {totalUnread > 0 && (
            <span className="text-[12px] font-medium text-slate-500 tabular-nums">{totalUnread}</span>
          )}
        </h2>
        <div className="flex-1" />
        <button
          onClick={onRefresh}
          disabled={syncing}
          className="text-slate-500 hover:text-slate-200 transition-colors disabled:opacity-50"
          title="Refresh (R)"
          aria-label="Refresh"
        >
          <I.Refresh size={14} className={syncing ? "spin" : ""} />
        </button>
        <button
          className="text-slate-500 hover:text-slate-200"
          title="More"
          aria-label="More options"
        >
          <I.More size={14} />
        </button>
      </div>

      {/* Search + filter */}
      <div className="px-3 pt-3 pb-2.5 border-b border-slate-800/60 space-y-2.5">
        <div className="relative">
          <I.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mail"
            className="w-full h-8 pl-8 pr-14 bg-slate-900 border border-slate-800 rounded-md text-[12.5px] text-slate-200 placeholder:text-slate-500 focus:border-slate-700 focus:bg-slate-900 focus-ring transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2">/</kbd>
        </div>
        <div className="flex items-center gap-1.5">
          <FilterChip
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
            disabled={isSearchMode}
          >
            All
          </FilterChip>
          <FilterChip
            active={activeFilter === "unread"}
            onClick={() => setActiveFilter("unread")}
            disabled={isSearchMode}
          >
            Unread{" "}
            {totalUnread > 0 && (
              <span className="ml-1 tabular-nums text-slate-500">{totalUnread}</span>
            )}
          </FilterChip>
          {isSearchMode && (
            <span className="ml-auto text-[10.5px] text-slate-500 italic">
              Filters paused — search active
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {syncing && cards.length === 0 ? (
          <ThreadSkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <ul>
            {filtered.map((card) => (
              <ThreadRow
                key={card.id}
                card={card}
                selected={card.id === selectedThreadId}
                onSelect={() => setSelectedThreadId(card.id)}
                hasReminder={hasActiveReminder(card.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "h-6 px-2.5 rounded-full text-[11.5px] font-medium transition-colors flex items-center " +
        (disabled
          ? "bg-slate-900/50 text-slate-600 border border-slate-800/60"
          : active
            ? "bg-slate-200 text-slate-950 hover:bg-slate-100"
            : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700")
      }
    >
      {children}
    </button>
  );
}

function ThreadRow({
  card,
  selected,
  onSelect,
  hasReminder,
}: {
  card: ThreadCard;
  selected: boolean;
  onSelect: () => void;
  hasReminder: boolean;
}) {
  const unread = card.unreadCount > 0;
  const lastFrom = nameOf(card.participants[0] ?? "");
  const others = card.participants.length > 2 ? ` +${card.participants.length - 2}` : "";

  return (
    <li>
      <button
        role="button"
        aria-selected={selected}
        onClick={onSelect}
        className={
          "group relative w-full px-4 py-3 text-left border-b border-slate-900/80 transition-colors " +
          (selected ? "bg-slate-900/80" : "hover:bg-slate-900/50")
        }
      >
        {selected && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-sky-400 rounded-r" />}
        {unread && !selected && (
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400" />
        )}

        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={
              "text-[12.5px] truncate flex-1 " +
              (unread ? "text-slate-100 font-semibold" : "text-slate-300 font-medium")
            }
          >
            {lastFrom}
            {others && <span className="text-slate-500">{others}</span>}
          </span>
          <span className="text-[10.5px] text-slate-500 tabular-nums flex-shrink-0">
            {smartTimestamp(card.lastMessageAt)}
          </span>
        </div>
        <div
          className={
            "text-[12.5px] truncate mb-0.5 " +
            (unread ? "text-slate-100 font-medium" : "text-slate-300")
          }
        >
          {card.subject}
        </div>
        <div className="text-[11.5px] text-slate-500 line-clamp-1 leading-relaxed">{card.preview}</div>
        {(hasReminder || card.hasAttachment) && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {hasReminder && (
              <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[10px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
                <I.Clock size={9} strokeWidth={2} />
                Follow-up
              </span>
            )}
            {card.hasAttachment && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                <I.Paperclip size={10} />
              </span>
            )}
          </div>
        )}
      </button>
    </li>
  );
}

function ThreadSkeletonList() {
  return (
    <ul className="px-4 py-3 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="skeleton h-3 w-24" />
            <div className="ml-auto skeleton h-2 w-8" />
          </div>
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-2 w-[80%]" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filter }: { filter: "all" | "unread" }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
        <I.Inbox size={18} />
      </div>
      <div className="text-[13px] font-medium text-slate-300 mb-1">All caught up</div>
      <div className="text-[12px] text-slate-500 max-w-[220px] leading-relaxed">
        {filter === "unread"
          ? "No unread mail in this folder."
          : "Nothing here yet. New mail will appear automatically."}
      </div>
    </div>
  );
}
