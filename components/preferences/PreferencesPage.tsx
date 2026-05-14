"use client";

// TODO(prefs-backend): every field in PreferencesState is local-only for this port.
// Persistence ships with the backend follow-up (see FRONTEND_PORT_PLAN.md A.6).
// Fields needing backend wiring: defaultTone, askClarifyingByDefault, selectedModel,
// apiKeys (incl. verify roundtrip), letCopilotReadAllThreads, autoSummarizeOnOpen,
// reminderLeadTime, toastDuration, desktopNotifications, notifyOn.*, density,
// timeFormat, showAvatars, showSnippets, monoStack, storeDrafts, retentionDays,
// shareAnonymizedUsage. Plus Account section's Reauthorize/Disconnect buttons.

import type { JSX } from "react";
import { useState } from "react";

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Paint,
  Plug,
  Shield,
  Sparkles,
  User,
} from "@/components/ui/icons";
import type { UiSession } from "@/lib/types-ui";

import { AccountSection } from "./sections/AccountSection";
import { AiSection } from "./sections/AiSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { ConnectedSection, type ConnectedSectionProps } from "./sections/ConnectedSection";
import { KeyboardSection } from "./sections/KeyboardSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { PrivacySection } from "./sections/PrivacySection";
import {
  DEFAULT_PREFS,
  type NotifyKey,
  type PreferencesState,
} from "./types";

type SectionId =
  | "account"
  | "ai"
  | "notifications"
  | "appearance"
  | "keyboard"
  | "connected"
  | "privacy";

const PREF_SECTIONS: { id: SectionId; label: string; Icon: typeof User }[] = [
  { id: "account", label: "Account", Icon: User },
  { id: "ai", label: "Copilot AI", Icon: Sparkles },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "appearance", label: "Appearance", Icon: Paint },
  { id: "keyboard", label: "Keyboard", Icon: Keyboard },
  { id: "connected", label: "Connected apps", Icon: Plug },
  { id: "privacy", label: "Privacy & data", Icon: Shield },
];

export interface PreferencesPageProps {
  session: UiSession;
  onBack: () => void;
  onSignOut: () => void;
  // Optional injections — for visual-smoke stories and the dev preview route.
  initialSection?: SectionId;
  initialPrefs?: PreferencesState;
  connectedProps?: ConnectedSectionProps;
}

export function PreferencesPage({
  session,
  onBack,
  onSignOut,
  initialSection = "account",
  initialPrefs = DEFAULT_PREFS,
  connectedProps,
}: PreferencesPageProps): JSX.Element {
  const [section, setSection] = useState<SectionId>(initialSection);
  const [prefs, setPrefs] = useState<PreferencesState>(initialPrefs);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<PreferencesState>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setDirty(true);
    setSaved(false);
  };
  const updateNotify = (key: NotifyKey, value: boolean) => {
    setPrefs((p) => ({ ...p, notifyOn: { ...p.notifyOn, [key]: value } }));
    setDirty(true);
    setSaved(false);
  };
  // TODO(prefs-backend): handleSave currently flashes "Saved" without persisting.
  const handleSave = () => {
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    setDirty(true);
    setSaved(false);
  };

  return (
    <div className="preferences-page h-full w-full flex flex-col bg-slate-950 text-slate-200">
      <div className="h-14 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950">
        <button
          type="button"
          onClick={onBack}
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12.5px] text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to inbox</span>
          <kbd className="ml-1">Esc</kbd>
        </button>
        <div className="w-px h-5 bg-slate-800" />
        <div className="text-[13px] text-slate-300 font-medium">Preferences</div>
        <div className="ml-auto flex items-center gap-3">
          {dirty && <span className="text-[11px] text-amber-300/90">Unsaved changes</span>}
          {saved && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="h-8 px-3 rounded-md text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className="h-8 px-3.5 rounded-md bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-[12.5px] font-semibold transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <nav className="w-[224px] flex-shrink-0 px-3 py-5 border-r border-slate-800/80 overflow-y-auto">
          <ul className="space-y-0.5">
            {PREF_SECTIONS.map((s) => {
              const active = section === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={
                      "group w-full h-9 px-3 rounded-md flex items-center gap-2.5 text-[13px] transition-colors " +
                      (active
                        ? "bg-slate-800/70 text-slate-100"
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200")
                    }
                  >
                    <s.Icon size={14} />
                    <span className="flex-1 text-left">{s.label}</span>
                    {active && <ChevronRight size={12} className="text-slate-400" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 mx-1 px-3 py-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-[11.5px] text-slate-400 mb-1.5">
              <Sparkles size={12} className="text-sky-300" />
              <span className="font-medium text-slate-200">Pro tip</span>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              Press <kbd>?</kbd> from anywhere to see every shortcut. Search supports{" "}
              <span className="font-mono text-slate-300">from:</span> and{" "}
              <span className="font-mono text-slate-300">has:attachment</span>.
            </p>
          </div>
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-8 py-8">
            {section === "account" && (
              <AccountSection session={session} onSignOut={onSignOut} />
            )}
            {section === "ai" && <AiSection prefs={prefs} update={update} />}
            {section === "notifications" && (
              <NotificationsSection
                prefs={prefs}
                update={update}
                updateNotify={updateNotify}
              />
            )}
            {section === "appearance" && <AppearanceSection prefs={prefs} update={update} />}
            {section === "keyboard" && <KeyboardSection />}
            {section === "connected" && <ConnectedSection {...(connectedProps ?? {})} />}
            {section === "privacy" && <PrivacySection prefs={prefs} update={update} />}
          </div>
        </div>
      </div>
    </div>
  );
}
