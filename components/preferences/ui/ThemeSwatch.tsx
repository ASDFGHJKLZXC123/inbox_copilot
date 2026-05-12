"use client";

import type { JSX } from "react";

import { Check } from "@/components/ui/icons";

export interface ThemeSwatchProps {
  name: string;
  sample: [string, string, string];
  selected?: boolean;
}

export function ThemeSwatch({ name, sample, selected }: ThemeSwatchProps): JSX.Element {
  return (
    <button
      type="button"
      className={
        "p-2 rounded-lg border text-left transition-colors w-full " +
        (selected ? "border-sky-400/60 ring-1 ring-sky-400/30" : "border-slate-800 hover:border-slate-700")
      }
    >
      <div className="h-16 rounded-md mb-2 overflow-hidden border border-slate-800 flex">
        {sample.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate-200">{name}</span>
        {selected && <Check size={12} className="text-sky-300" strokeWidth={2.6} />}
      </div>
    </button>
  );
}

export interface ThemeSwatchLockedProps {
  name: string;
  sample: [string, string, string];
}

export function ThemeSwatchLocked({ name, sample }: ThemeSwatchLockedProps): JSX.Element {
  return (
    <button
      type="button"
      disabled
      className="p-2 rounded-lg border border-slate-800/50 text-left opacity-50 cursor-not-allowed w-full"
    >
      <div className="h-16 rounded-md mb-2 overflow-hidden border border-slate-800 flex">
        {sample.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate-500">{name}</span>
        <span className="text-[9.5px] uppercase tracking-wide text-slate-600">Soon</span>
      </div>
    </button>
  );
}
