// Preferences state — flat shape matching mockup DEFAULT_PREFS at
// `Email Copilot/src/PreferencesPage.jsx` line 14-46. Do NOT nest into
// ai/notifications/appearance/privacy groups; section components reach into
// prefs directly with flat keys. See FRONTEND_PORT_PLAN.md Appendix A.6.
//
// TODO(prefs-backend): persist `PreferencesState` to a new `user_preferences`
// table once the product decides which fields graduate beyond cosmetic. Not
// in scope for this port — `prefs` lives in `useState(DEFAULT_PREFS)` only.

import type { Tone } from "@/lib/types-ui";

export type ProviderId =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "mistral"
  | "deepseek"
  | "cohere"
  | "meta";

// API key per-provider record — mockup line 20-27. Do NOT collapse fields;
// KeyBadge + verify flow read all of them.
export interface PrefApiKey {
  value: string;
  verified: boolean;
  locked: boolean;
  enabled: boolean;
  verifiedAt: number | null;
}

export type NotifyKey = "mentions" | "reminders" | "sends" | "sync";

export interface PreferencesState {
  // AI
  defaultTone: Tone;
  askClarifyingByDefault: boolean;
  selectedModel: string;
  apiKeys: Record<ProviderId, PrefApiKey>;
  letCopilotReadAllThreads: boolean;
  autoSummarizeOnOpen: boolean;
  // Notifications
  reminderLeadTime: number;
  toastDuration: number;
  desktopNotifications: boolean;
  notifyOn: Record<NotifyKey, boolean>;
  // Appearance
  density: "compact" | "comfortable" | "spacious";
  timeFormat: "12h" | "24h";
  showAvatars: boolean;
  showSnippets: boolean;
  monoStack: string;
  // Privacy
  storeDrafts: boolean;
  retentionDays: number;
  shareAnonymizedUsage: boolean;
}

const emptyKey: PrefApiKey = {
  value: "",
  verified: false,
  locked: false,
  enabled: true,
  verifiedAt: null,
};

export const DEFAULT_PREFS: PreferencesState = {
  defaultTone: "concise",
  askClarifyingByDefault: false,
  selectedModel: "anthropic/claude-haiku-4-5",
  apiKeys: {
    anthropic: { ...emptyKey },
    openai: { ...emptyKey },
    google: { ...emptyKey },
    xai: { ...emptyKey },
    mistral: { ...emptyKey },
    deepseek: { ...emptyKey },
    cohere: { ...emptyKey },
    meta: { ...emptyKey },
  },
  letCopilotReadAllThreads: true,
  autoSummarizeOnOpen: false,
  reminderLeadTime: 15,
  toastDuration: 5,
  desktopNotifications: true,
  notifyOn: { mentions: true, reminders: true, sends: false, sync: false },
  density: "comfortable",
  timeFormat: "12h",
  showAvatars: true,
  showSnippets: true,
  monoStack: "Geist Mono",
  storeDrafts: true,
  retentionDays: 30,
  shareAnonymizedUsage: false,
};

export interface SectionProps {
  prefs: PreferencesState;
  update: (patch: Partial<PreferencesState>) => void;
}

export interface NotificationsSectionProps extends SectionProps {
  updateNotify: (key: NotifyKey, value: boolean) => void;
}
