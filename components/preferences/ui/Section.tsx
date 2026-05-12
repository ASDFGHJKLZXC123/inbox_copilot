"use client";

import type { JSX, ReactNode } from "react";

export interface SectionProps {
  title: string;
  desc?: string;
  children: ReactNode;
}

export function Section({ title, desc, children }: SectionProps): JSX.Element {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold text-slate-50 tracking-tight">{title}</h1>
        {desc && <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">{desc}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
