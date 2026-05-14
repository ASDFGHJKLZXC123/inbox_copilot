"use client";

import type { JSX } from "react";

export interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  suffix?: string;
  /** Id of the visible label this slider is named by (typically the Row title). */
  "aria-labelledby"?: string;
}

export function Slider({
  min,
  max,
  step,
  value,
  onChange,
  suffix = "",
  ...aria
}: SliderProps): JSX.Element {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="w-[220px] flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-labelledby={aria["aria-labelledby"]}
        className="flex-1 h-1 rounded-full appearance-none cursor-pointer focus-ring"
        style={{
          background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${pct}%, #1e293b ${pct}%, #1e293b 100%)`,
        }}
      />
      <span className="text-[11.5px] text-slate-300 font-mono tabular-nums w-14 text-right">
        {value}
        {suffix}
      </span>
    </div>
  );
}
