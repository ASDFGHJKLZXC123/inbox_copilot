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
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: SegmentedProps<T>): JSX.Element {
  const h = size === "sm" ? "h-7" : "h-8";
  return (
    <div className={"inline-flex bg-slate-900/80 border border-slate-800 rounded-md p-0.5 " + h}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            "px-3 rounded text-[11.5px] font-medium transition-colors " +
            (value === o.value ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
