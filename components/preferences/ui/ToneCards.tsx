"use client";

import type { JSX } from "react";

import type { Tone } from "@/lib/types-ui";

export interface ToneCardsProps {
  value: Tone;
  onChange: (next: Tone) => void;
}

interface ToneOption {
  value: Tone;
  label: string;
  preview: string;
}

const TONES: ToneOption[] = [
  {
    value: "concise",
    label: "Concise",
    preview: '"Aligned on pool and liq pref. Sending names tomorrow."',
  },
  {
    value: "friendly",
    label: "Friendly",
    preview: '"Got it — thanks for the quick turn. Pool stays at 18%."',
  },
  {
    value: "formal",
    label: "Formal",
    preview: '"We accept the 18% pool and the 1× non-participating preference."',
  },
];

export function ToneCards({ value, onChange }: ToneCardsProps): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {TONES.map((t) => {
        const sel = value === t.value;
        return (
          <button
            type="button"
            key={t.value}
            onClick={() => onChange(t.value)}
            className={
              "text-left p-3.5 rounded-lg border transition-all " +
              (sel
                ? "border-sky-400/50 bg-sky-400/5 ring-1 ring-sky-400/30"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-700")
            }
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={
                  "text-[12.5px] font-semibold " + (sel ? "text-sky-200" : "text-slate-200")
                }
              >
                {t.label}
              </span>
              <span
                className={
                  "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center " +
                  (sel ? "border-sky-400 bg-sky-400" : "border-slate-700")
                }
              >
                {sel && <span className="w-1 h-1 rounded-full bg-slate-950" />}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed italic">{t.preview}</div>
          </button>
        );
      })}
    </div>
  );
}
