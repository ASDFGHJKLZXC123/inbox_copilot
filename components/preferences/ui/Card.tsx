"use client";

import type { JSX, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  destructive?: boolean;
}

export function Card({ children, destructive }: CardProps): JSX.Element {
  return (
    <div
      className={
        "rounded-lg bg-slate-900/40 border overflow-hidden " +
        (destructive ? "border-rose-500/20" : "border-slate-800")
      }
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: string;
  desc?: string;
  destructive?: boolean;
}

export function CardHeader({ title, desc, destructive }: CardHeaderProps): JSX.Element {
  return (
    <div className="px-5 pt-4 pb-3">
      <div
        className={
          "text-[13px] font-semibold " + (destructive ? "text-rose-200" : "text-slate-100")
        }
      >
        {title}
      </div>
      {desc && <div className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{desc}</div>}
    </div>
  );
}
