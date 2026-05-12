"use client";

import type { JSX } from "react";
import { useState } from "react";

import { Check } from "@/components/ui/icons";
import { ClearCacheDialog } from "@/components/ui/ClearCacheAction";

import { Card, CardHeader } from "../ui/Card";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import type { SectionProps } from "../types";

const PROMISES = [
  "Train shared models on your mail. Your data is never used for training.",
  "Send messages or modify mail without an explicit click.",
  "Index attachments. We list filenames; we never read bodies.",
  "Share data between accounts or organizations.",
];

export function PrivacySection({ prefs, update }: SectionProps): JSX.Element {
  const [clearOpen, setClearOpen] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  return (
    <Section
      title="Privacy & data"
      desc="What Copilot stores locally, how long, and what it shares."
    >
      <Card>
        <Row
          title="Cache drafts on this device"
          desc="When off, drafts only live in memory and clear on refresh."
          control={
            <Toggle
              value={prefs.storeDrafts}
              onChange={(v) => update({ storeDrafts: v })}
            />
          }
        />
        <Row
          title="Local cache retention"
          desc={`Threads, message bodies, and search index are wiped after ${prefs.retentionDays} days of inactivity.`}
          control={
            <Slider
              min={1}
              max={90}
              step={1}
              value={prefs.retentionDays}
              suffix=" days"
              onChange={(v) => update({ retentionDays: v })}
            />
          }
        />
        <Row
          title="Share anonymized usage"
          desc="Aggregate event counts only — never message content. Disabled by default."
          control={
            <Toggle
              value={prefs.shareAnonymizedUsage}
              onChange={(v) => update({ shareAnonymizedUsage: v })}
            />
          }
          last
        />
      </Card>

      <Card>
        <CardHeader title="What Copilot never does" />
        <ul className="px-5 pb-5 space-y-2 text-[12.5px] text-slate-300">
          {PROMISES.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                <Check size={9} strokeWidth={2.8} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card destructive>
        <CardHeader
          title="Clear local cache"
          desc="Wipes all locally cached threads, messages, drafts, and reminders. Your Gmail account is untouched."
          destructive
        />
        <div className="px-5 pb-4">
          {clearError && (
            <div className="mb-2 text-[11.5px] text-rose-300">{clearError}</div>
          )}
          <button
            type="button"
            onClick={() => {
              setClearError(null);
              setClearOpen(true);
            }}
            className="h-9 px-3.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[12.5px] font-medium transition-colors"
          >
            Clear local cache…
          </button>
        </div>
      </Card>

      <ClearCacheDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onError={(msg) => setClearError(msg)}
      />
    </Section>
  );
}
