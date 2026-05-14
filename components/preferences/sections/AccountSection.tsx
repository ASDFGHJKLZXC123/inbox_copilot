"use client";

import type { JSX } from "react";

import { Dot, LogOut, Refresh } from "@/components/ui/icons";
import type { UiSession } from "@/lib/types-ui";

import { Card, CardHeader } from "../ui/Card";
import { SecondaryButton } from "../ui/SecondaryButton";
import { Section } from "../ui/Section";

export interface AccountSectionProps {
  session: UiSession;
  onSignOut: () => void;
}

interface ScopeRowProps {
  label: string;
  desc: string;
  status: string;
  last?: boolean;
}

function ScopeRow({ label, desc, status, last }: ScopeRowProps): JSX.Element {
  return (
    <div
      className={
        "px-5 py-3 flex items-center gap-3 " + (last ? "" : "border-b border-slate-800/60")
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <code className="text-[12px] font-mono text-slate-200">{label}</code>
        <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
      </div>
      <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wide">
        {status}
      </span>
    </div>
  );
}

// Avatar background hue derived from email — keeps the mockup's varied-but-stable
// per-user accent without depending on MOCK data.
function avatarHue(email: string): number {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function AccountSection({ session, onSignOut }: AccountSectionProps): JSX.Element {
  const { user } = session;
  return (
    <Section title="Account" desc="The Google account Copilot is connected to.">
      <Card>
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-semibold text-slate-950"
            style={{ background: `oklch(0.78 0.13 ${avatarHue(user.email)})` }}
          >
            {user.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-semibold text-slate-100">{user.name}</div>
            <div className="text-[12.5px] text-slate-400 font-mono">{user.email}</div>
            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Dot size={10} className="text-emerald-400" />
                Connected
              </span>
              <span className="text-slate-400">
                Provider · <span className="text-slate-300">Google</span>
              </span>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-2">
          {/* TODO(prefs-backend): wire "Reauthorize Google" to a real OAuth refresh flow. */}
          <SecondaryButton icon={Refresh} label="Reauthorize Google" />
          <SecondaryButton icon={LogOut} label="Sign out" onClick={onSignOut} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Granted scopes"
          desc="Copilot only requests what it needs to read and send your mail."
        />
        <ScopeRow
          label="gmail.readonly"
          desc="Read messages, labels, and threads"
          status="granted"
        />
        <ScopeRow
          label="gmail.send"
          desc="Send and reply to mail on your behalf"
          status="granted"
        />
        <ScopeRow
          label="gmail.modify"
          desc="Archive, trash, mark read/unread"
          status="granted"
        />
        <ScopeRow
          label="gmail.metadata"
          desc="Headers only (push notifications)"
          status="granted"
          last
        />
      </Card>

      <Card destructive>
        <CardHeader
          title="Danger zone"
          desc="Destructive actions. There is no undo."
          destructive
        />
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[13px] text-slate-200 font-medium">
              Disconnect Google account
            </div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">
              Revokes our tokens and removes the live sync subscription.
            </div>
          </div>
          {/* TODO(prefs-backend): wire "Disconnect" to a real token-revoke endpoint. */}
          <button
            type="button"
            className="h-8 px-3 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[12px] font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>
      </Card>
    </Section>
  );
}
