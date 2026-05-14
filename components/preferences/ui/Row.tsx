"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type JSX,
  type ReactElement,
  type ReactNode,
} from "react";

export interface RowProps {
  title: string;
  desc?: string;
  control: ReactNode;
  last?: boolean;
}

export function Row({ title, desc, control, last }: RowProps): JSX.Element {
  const titleId = useId();

  // Inject aria-labelledby into the control so screen readers tie it to this
  // row's visible title. Toggle/Slider/Segmented/ToneCards all accept this
  // prop; for anything else we leave the control untouched.
  const labelled = isValidElement(control)
    ? cloneElement(control as ReactElement<{ "aria-labelledby"?: string }>, {
        "aria-labelledby": titleId,
      })
    : control;

  return (
    <div
      className={
        "px-5 py-3.5 flex items-center gap-4 " + (last ? "" : "border-b border-slate-800/60")
      }
    >
      <div className="flex-1 min-w-0">
        <div id={titleId} className="text-[12.5px] text-slate-200 font-medium">
          {title}
        </div>
        {desc && (
          <div className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed pr-4">{desc}</div>
        )}
      </div>
      <div className="flex-shrink-0">{labelled}</div>
    </div>
  );
}
