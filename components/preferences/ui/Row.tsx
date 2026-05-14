"use client";

import type { JSX, ReactNode } from "react";

export interface RowProps {
  title: string;
  desc?: string;
  control: ReactNode;
  last?: boolean;
}

export function Row({ title, desc, control, last }: RowProps): JSX.Element {
  return (
    <div
      className={
        "px-5 py-3.5 flex items-center gap-4 " + (last ? "" : "border-b border-slate-800/60")
      }
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-slate-200 font-medium">{title}</div>
        {desc && (
          <div className="mt-0.5 text-[11.5px] text-slate-400 leading-relaxed pr-4">{desc}</div>
        )}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}
