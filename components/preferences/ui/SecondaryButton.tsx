"use client";

import type { ComponentType, JSX } from "react";

import type { IconProps } from "@/components/ui/icons";

export interface SecondaryButtonProps {
  icon: ComponentType<IconProps>;
  label: string;
  onClick?: () => void;
}

export function SecondaryButton({
  icon: Icon,
  label,
  onClick,
}: SecondaryButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[12px] font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
