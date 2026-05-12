"use client";

import {
  Archive,
  CaretUp,
  Clock,
  EnvelopeOpen,
  FileText,
  PaperPlaneTilt,
  PencilSimple,
  Sparkle,
  Tray,
  Trash,
} from "@phosphor-icons/react";

interface SidebarProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
}

const navItems = [
  { id: "inbox", label: "Inbox", icon: Tray, iconWeight: "fill" as const, badge: 12, badgeClass: "bg-brand-100 text-brand-600" },
  { id: "ai-drafts", label: "AI Drafts", icon: Sparkle, badge: 3, badgeClass: "bg-slate-200 text-slate-600", aiIcon: true },
  { id: "reminders", label: "Reminders", icon: Clock, badge: 2, badgeClass: "bg-orange-100 text-orange-600" },
  { id: "sent", label: "Sent", icon: PaperPlaneTilt },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash },
];

const labels = [
  { id: "project-alpha", label: "Project Alpha", color: "bg-blue-400" },
  { id: "design-team", label: "Design Team", color: "bg-purple-400" },
  { id: "personal", label: "Personal", color: "bg-green-400" },
];

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0 font-sans">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-ai-600">
          <EnvelopeOpen size={24} weight="fill" className="text-ai-600" />
          <span className="font-bold text-lg tracking-tight text-slate-900">
            Mail<span className="text-ai-600">Copilot</span>
          </span>
        </div>
      </div>

      {/* New Message */}
      <div className="p-4">
        <button className="w-full bg-brand-600 hover:bg-brand-500 text-white shadow-sm rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 font-medium transition-colors text-sm">
          <PencilSimple size={18} />
          New Message
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto inbox-scroll py-2 px-3 space-y-6">
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon, iconWeight, badge, badgeClass, aiIcon }) => {
            const isActive = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => onNavChange(id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    weight={iconWeight ?? "regular"}
                    className={aiIcon ? "text-ai-600" : undefined}
                  />
                  {label}
                </div>
                {badge !== undefined && (
                  <span className={`py-0.5 px-2 rounded-full text-xs ${badgeClass}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Labels */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Labels
          </h3>
          <nav className="space-y-1">
            {labels.map(({ id, label, color }) => (
              <button
                key={id}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 transition-colors text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* User profile */}
      <div className="p-4 border-t border-slate-200">
        <button className="flex items-center gap-3 w-full hover:bg-slate-100 p-2 rounded-md transition-colors text-left">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-ai-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            EJ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">Elena Jenkins</p>
            <p className="text-xs text-slate-500 truncate">elena@company.com</p>
          </div>
          <CaretUp size={14} className="text-slate-400 flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}
