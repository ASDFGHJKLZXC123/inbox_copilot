"use client";

import type { JSX } from "react";

import { Check, Google, Lightning } from "@/components/ui/icons";

// Visual port of .archive/email-copilot-mockup/src/SignInGate.jsx (40 LOC).
// Prop interface per FRONTEND_PORT_PLAN.md Appendix A.5.
// All 5 visual elements from Appendix B.4 are present:
//   1) background grid, 2) brand chip, 3) headline + paragraph,
//   4) Continue-with-Google CTA, 5) privacy line.
// buildLabel is optional per A.5; we render NEXT_PUBLIC_BUILD_SHA when set.
export interface SignInGateProps {
  onSignIn: () => void;
  buildLabel?: string;
}

export function SignInGate({ onSignIn, buildLabel }: SignInGateProps): JSX.Element {
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.08), transparent 60%), linear-gradient(rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.5) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 64px 64px, 64px 64px"
        }}
      />

      <div className="relative z-10 max-w-[440px] px-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-slate-950 shadow-2xl shadow-sky-500/20 mb-6">
          <Lightning size={28} strokeWidth={2.2} />
        </div>
        <h1 className="text-[28px] font-semibold text-slate-50 tracking-tight leading-tight mb-3">
          The inbox that drafts your replies.
        </h1>
        <p className="text-[14px] text-slate-400 leading-relaxed mb-8">
          Connect Gmail to read, summarize, draft, and follow up — all in one keyboard-driven surface.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="h-11 px-5 mx-auto rounded-md bg-white hover:bg-slate-100 text-slate-900 text-[14px] font-medium flex items-center gap-3 transition-colors shadow-lg"
        >
          <Google size={18} />
          Continue with Google
        </button>
        <div className="mt-6 text-[11.5px] text-slate-500 flex items-center justify-center gap-1.5">
          <Check size={11} className="text-emerald-400" />
          Read &amp; send scopes only. We never index attachments.
        </div>
      </div>

      {buildLabel ? (
        <div className="absolute bottom-5 left-0 right-0 text-center text-[10.5px] text-slate-600 font-mono">
          {buildLabel}
        </div>
      ) : null}
    </div>
  );
}
