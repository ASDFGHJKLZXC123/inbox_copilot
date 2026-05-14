"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";

import { api } from "@/lib/ui/api";
import type { ProviderSubscription } from "@/lib/types";

import { Card } from "../ui/Card";
import { Section } from "../ui/Section";

interface ConnectionRowProps {
  name: string;
  status: "active" | "suggested";
  desc: string;
  meta?: string;
  color: string;
  initial: string;
  last?: boolean;
}

function ConnectionRow({
  name,
  status,
  desc,
  meta,
  color,
  initial,
  last,
}: ConnectionRowProps): JSX.Element {
  const active = status === "active";
  return (
    <div
      className={
        "px-5 py-4 flex items-center gap-3.5 " + (last ? "" : "border-b border-slate-800/60")
      }
    >
      <div
        className={
          "w-9 h-9 rounded-md bg-gradient-to-br " +
          color +
          " flex items-center justify-center text-slate-950 text-[13px] font-bold flex-shrink-0"
        }
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-100">{name}</span>
          {active && (
            <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wide">
              Connected
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-slate-400 mt-0.5">{desc}</div>
        {meta && <div className="text-[10.5px] text-slate-600 font-mono mt-1">{meta}</div>}
      </div>
      <button
        type="button"
        className={
          "h-8 px-3 rounded-md text-[12px] font-medium transition-colors " +
          (active
            ? "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
            : "bg-slate-100 hover:bg-white text-slate-950")
        }
      >
        {active ? "Manage" : "Connect"}
      </button>
    </div>
  );
}

function formatLastSync(updatedAt: string): string {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 60_000) return `Last sync ${Math.max(1, Math.floor(diff / 1000))} s ago`;
  if (diff < 60 * 60_000) return `Last sync ${Math.floor(diff / 60_000)} min ago`;
  if (diff < 24 * 60 * 60_000) return `Last sync ${Math.floor(diff / (60 * 60_000))} h ago`;
  return `Last sync ${Math.floor(diff / (24 * 60 * 60_000))} d ago`;
}

function describeSub(sub: ProviderSubscription): {
  name: string;
  desc: string;
  meta: string;
  color: string;
  initial: string;
} {
  if (sub.provider === "google") {
    return {
      name: "Gmail",
      desc: "Read, send, modify · Push notifications enabled",
      meta: `${sub.email} · ${formatLastSync(sub.updatedAt)}`,
      color: "from-rose-400 to-amber-400",
      initial: "G",
    };
  }
  return {
    name: "Microsoft Outlook",
    desc: "Read, send, modify · Push notifications enabled",
    meta: `${sub.email} · ${formatLastSync(sub.updatedAt)}`,
    color: "from-blue-400 to-indigo-500",
    initial: "M",
  };
}

export interface ConnectedSectionProps {
  // Optional injection for visual smoke / vitest stories. When omitted, the
  // component fetches live subscriptions via the Phase 0 api adapter.
  subscriptions?: ProviderSubscription[];
}

export function ConnectedSection({
  subscriptions: injected,
}: ConnectedSectionProps = {}): JSX.Element {
  const [subscriptions, setSubscriptions] = useState<ProviderSubscription[] | null>(
    injected ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (injected !== undefined) {
      setSubscriptions(injected);
      return;
    }
    let cancelled = false;
    api
      .listSubscriptions()
      .then((list) => {
        if (!cancelled) setSubscriptions(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load connections";
        setError(message);
        setSubscriptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [injected]);

  const activeRows = (subscriptions ?? []).map((s) => ({ ...describeSub(s), key: s.id }));
  const loading = subscriptions === null && error === null;

  return (
    <Section
      title="Connected apps"
      desc="Services Copilot can read from or push to. All connections are scoped to your account only."
    >
      <Card>
        {loading && (
          <div className="px-5 py-6 text-[12px] text-slate-400">Loading connections…</div>
        )}
        {error && (
          <div className="px-5 py-3 text-[12px] text-amber-300 border-b border-slate-800/60">
            {error}
          </div>
        )}
        {!loading && activeRows.length === 0 && (
          <div className="px-5 py-4 text-[12px] text-slate-400 border-b border-slate-800/60">
            No mail provider connected yet. Sign in with Google to enable Gmail sync.
          </div>
        )}
        {activeRows.map((row) => (
          <ConnectionRow
            key={row.key}
            status="active"
            name={row.name}
            desc={row.desc}
            meta={row.meta}
            color={row.color}
            initial={row.initial}
          />
        ))}
        {/* TODO(prefs-backend): the rows below are aspirational integrations from the mockup —
            once first-party connectors ship they should be wired through the same api adapter. */}
        <ConnectionRow
          name="Google Calendar"
          status="suggested"
          desc="See upcoming meetings inline when threads reference them"
          color="from-sky-400 to-indigo-500"
          initial="C"
        />
        <ConnectionRow
          name="Linear"
          status="suggested"
          desc="Convert reply requests into Linear issues with one keystroke"
          color="from-violet-400 to-fuchsia-500"
          initial="L"
        />
        <ConnectionRow
          name="Slack"
          status="suggested"
          desc="Forward replies into a channel or DM"
          color="from-emerald-400 to-teal-500"
          initial="S"
          last
        />
      </Card>
    </Section>
  );
}
