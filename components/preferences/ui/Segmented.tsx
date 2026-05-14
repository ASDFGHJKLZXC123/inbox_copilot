"use client";

import type { JSX } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  /** Id of the visible group label this segmented control is named by. */
  "aria-labelledby"?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  ...aria
}: SegmentedProps<T>): JSX.Element {
  const h = size === "sm" ? "h-7" : "h-8";
  // Uses the aria-pressed (toggle button) pattern rather than role="radiogroup"
  // + role="radio". Radio-group semantics require arrow-key navigation per
  // WAI-ARIA APG; aria-pressed lets each option Tab normally and announces
  // selection state without the extra keyboard machinery. Issue #7 proposed
  // either form as acceptable. The outer container still carries aria-label{,ledby}
  // via a generic role="group" so screen readers announce the group name.
  return (
    <div
      role="group"
      aria-labelledby={aria["aria-labelledby"]}
      className={"inline-flex bg-slate-900/80 border border-slate-800 rounded-md p-0.5 " + h}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            "px-3 rounded text-[11.5px] font-medium transition-colors focus-ring " +
            (value === o.value ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
