"use client";

import type { JSX } from "react";

export interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function Toggle({ value, onChange }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={
        "relative w-9 h-5 rounded-full transition-colors " +
        (value ? "bg-sky-400" : "bg-slate-700")
      }
    >
      <span
        className={
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all " +
          (value ? "left-[18px]" : "left-0.5")
        }
      />
    </button>
  );
}
