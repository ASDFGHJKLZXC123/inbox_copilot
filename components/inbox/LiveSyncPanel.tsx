"use client";

import { useState } from "react";

import type { ProviderSubscription } from "@/lib/types";
import type { SyncStatus } from "@/lib/types-ui";
import * as I from "@/components/ui/icons";

import { smartTimestamp } from "./helpers";

export interface LiveSyncPanelProps {
  status: SyncStatus;
  lastSyncedAt: string | null;
  subscriptions: ProviderSubscription[];
  onEnable: () => Promise<void> | void;
  onSimulateEvent: () => Promise<void> | void;
}

const PILLS: Record<SyncStatus, { label: string; cls: string; dot: string }> = {
  connected: {
    label: "Live",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  refreshed: {
    label: "Refreshed",
    cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
  },
  disconnected: {
    label: "Reconnecting…",
    cls: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    dot: "bg-amber-400",
  },
  off: {
    label: "Sync off",
    cls: "bg-slate-800 text-slate-400 border-slate-700",
    dot: "bg-slate-500",
  },
};

export function LiveSyncPanel({
  status,
  lastSyncedAt,
  subscriptions,
  onEnable,
  onSimulateEvent,
}: LiveSyncPanelProps) {
  const [open, setOpen] = useState(false);
  const pill = PILLS[status];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={
          "h-7 px-2 inline-flex items-center gap-1.5 rounded-full text-[10.5px] font-medium border transition-colors " +
          pill.cls
        }
      >
        <span className="relative flex items-center">
          <span className={"w-1.5 h-1.5 rounded-full " + pill.dot} />
          {status === "connected" && (
            <span className={"absolute w-1.5 h-1.5 rounded-full " + pill.dot + " animate-ping opacity-60"} />
          )}
        </span>
        <span>{pill.label}</span>
        {lastSyncedAt && status !== "off" && (
          <span className="text-slate-500 font-normal">· {smartTimestamp(lastSyncedAt)}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-40 w-[340px] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-3.5 py-3 border-b border-slate-800">
              <div className="text-[12px] font-semibold text-slate-100 flex items-center gap-2">
                <I.Radio
                  size={12}
                  className={status === "connected" ? "text-emerald-400" : "text-slate-400"}
                />
                Live sync
              </div>
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                Receives Gmail push notifications via a Cloud Pub/Sub topic; refresh fires within
                2 s of new mail.
              </p>
            </div>

            <div className="px-3.5 py-2.5 border-b border-slate-800">
              <div className="text-[10.5px] uppercase tracking-wide text-slate-500 font-medium mb-2">
                Subscriptions
              </div>
              {subscriptions.length === 0 ? (
                <div className="text-[11.5px] text-slate-500 mb-2">No active subscription yet.</div>
              ) : (
                <ul className="space-y-1.5">
                  {subscriptions.map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-[11.5px]">
                      <span
                        className={
                          "mt-1 w-1.5 h-1.5 rounded-full " +
                          (s.status === "active" ? "bg-emerald-400" : "bg-amber-400")
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-200 truncate font-mono text-[11px]">
                          {s.externalId ?? s.email}
                        </div>
                        <div className="text-slate-500">
                          {s.status}
                          {s.expiresAt ? ` · expires ${smartTimestamp(s.expiresAt)}` : ""}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-3.5 py-2.5 space-y-2">
              <button
                onClick={() => onEnable()}
                className="w-full h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-[12px] font-medium text-slate-100 flex items-center justify-center gap-1.5 transition-colors"
              >
                <I.Refresh size={12} />
                Renew subscription
              </button>
              <button
                onClick={() => onSimulateEvent()}
                className="w-full h-8 rounded-md bg-sky-400/10 hover:bg-sky-400/15 border border-sky-400/30 text-[12px] font-medium text-sky-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <I.Lightning size={12} />
                Simulate inbound mail
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
