"use client";

import type { ComponentType } from "react";

import type { NavId, UiSession } from "@/lib/types-ui";
import * as I from "@/components/ui/icons";

export interface SidebarProps {
  activeNav: NavId;
  setActiveNav: (id: NavId) => void;
  session: UiSession;
  folderCounts: Partial<Record<NavId, number>>;
  /** Count of active (uncompleted) reminders. Rendered as a badge next to "Follow-ups". */
  activeReminderCount: number;
  onCompose: () => void;
  onSignOut: () => void;
  onClearCache: () => void;
  onOpenPreferences: () => void;
  accountMenuOpen: boolean;
  setAccountMenuOpen: (open: boolean) => void;
}

const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "sent", label: "Sent" },
  { id: "drafts", label: "Drafts" },
  { id: "archive", label: "Archive" },
  { id: "trash", label: "Trash" },
];

const NAV_ICONS: Record<NavId, ComponentType<I.IconProps>> = {
  inbox: I.Inbox,
  sent: I.Send,
  drafts: I.Draft,
  archive: I.Archive,
  trash: I.Trash,
};

function avatarHue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

export function Sidebar({
  activeNav,
  setActiveNav,
  session,
  folderCounts,
  activeReminderCount,
  onCompose,
  onSignOut,
  onClearCache,
  onOpenPreferences,
  accountMenuOpen,
  setAccountMenuOpen,
}: SidebarProps) {
  return (
    <aside className="w-[228px] flex-shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-slate-800/80">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-slate-950 shadow-sm">
          <I.Lightning size={15} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-slate-100 leading-tight">Copilot</div>
          <div className="text-[10.5px] text-slate-500 font-medium tracking-wide uppercase">Inbox</div>
        </div>
        <button
          onClick={onOpenPreferences}
          className="text-slate-500 hover:text-slate-200 transition-colors"
          title="Preferences"
          aria-label="Preferences"
        >
          <I.Settings size={14} />
        </button>
      </div>

      {/* Compose */}
      <div className="px-3 pt-3">
        <button
          onClick={onCompose}
          className="w-full h-9 rounded-md bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-200 text-[13px] font-medium flex items-center justify-center transition-colors focus-ring"
        >
          Compose
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 pt-4 flex-1">
        <div className="px-2 pb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-slate-500 font-medium">
          Mailboxes
        </div>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            const Icon = NAV_ICONS[item.id];
            const count = folderCounts[item.id] ?? 0;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveNav(item.id)}
                  className={
                    "group w-full h-8 px-2 rounded-md flex items-center gap-2.5 text-[13px] transition-colors " +
                    (active
                      ? "bg-slate-800/70 text-slate-100"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200")
                  }
                >
                  <Icon size={15} strokeWidth={active ? 1.9 : 1.6} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "inbox" && count > 0 && (
                    <span className="text-[11px] font-medium text-slate-300 tabular-nums">{count}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 px-2 pb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-slate-500 font-medium">
          Copilot
        </div>
        <ul className="space-y-0.5">
          <li>
            <button className="group w-full h-8 px-2 rounded-md flex items-center gap-2.5 text-[13px] text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-colors">
              <I.Bell size={15} />
              <span className="flex-1 text-left">Follow-ups</span>
              {activeReminderCount > 0 && (
                <span className="text-[11px] font-medium text-slate-300 tabular-nums">
                  {activeReminderCount}
                </span>
              )}
            </button>
          </li>
          <li>
            <button className="group w-full h-8 px-2 rounded-md flex items-center gap-2.5 text-[13px] text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-colors">
              <I.Sparkles size={15} />
              <span className="flex-1 text-left">AI history</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Account footer */}
      <div className="relative border-t border-slate-800/80">
        {accountMenuOpen && (
          <AccountMenu
            session={session}
            onSignOut={onSignOut}
            onClearCache={onClearCache}
            onOpenPreferences={onOpenPreferences}
            onClose={() => setAccountMenuOpen(false)}
          />
        )}
        <button
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          className={
            "w-full px-3 py-3 flex items-center gap-2.5 text-left transition-colors " +
            (accountMenuOpen ? "bg-slate-900" : "hover:bg-slate-900/60")
          }
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold text-slate-950 flex-shrink-0"
            style={{ background: `oklch(0.78 0.13 ${avatarHue(session.user.email)})` }}
          >
            {session.user.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] text-slate-100 font-medium truncate leading-tight">
              {session.user.name}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{session.user.email}</div>
          </div>
          <I.ChevronUp
            size={13}
            className={"text-slate-500 transition-transform " + (accountMenuOpen ? "" : "rotate-180")}
          />
        </button>
      </div>
    </aside>
  );
}

function AccountMenu({
  session,
  onSignOut,
  onClearCache,
  onOpenPreferences,
  onClose,
}: {
  session: UiSession;
  onSignOut: () => void;
  onClearCache: () => void;
  onOpenPreferences: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute bottom-full left-3 right-3 mb-2 z-30 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl shadow-black/40 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-800">
          <div className="text-[12px] text-slate-300 font-medium truncate">{session.user.name}</div>
          <div className="text-[11px] text-slate-500 truncate">{session.user.email}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-emerald-300">
            <I.Dot size={10} className="text-emerald-400" />
            <span>Connected to Google</span>
          </div>
        </div>
        <div className="py-1">
          <MenuItem
            icon={I.Settings}
            label="Preferences"
            onClick={() => {
              onClose();
              onOpenPreferences();
            }}
          />
          <MenuItem icon={I.Refresh} label="Resync this account" onClick={onClose} />
        </div>
        <div className="py-1 border-t border-slate-800">
          <MenuItem
            icon={I.Trash}
            label="Clear local cache…"
            destructive
            onClick={() => {
              onClose();
              onClearCache();
            }}
          />
          <MenuItem
            icon={I.LogOut}
            label="Sign out"
            onClick={() => {
              onClose();
              onSignOut();
            }}
          />
        </div>
      </div>
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: ComponentType<I.IconProps>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full px-3 h-8 text-[12.5px] flex items-center gap-2.5 transition-colors " +
        (destructive
          ? "text-rose-300 hover:bg-rose-500/10"
          : "text-slate-300 hover:bg-slate-800/70")
      }
    >
      <Icon size={14} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}
