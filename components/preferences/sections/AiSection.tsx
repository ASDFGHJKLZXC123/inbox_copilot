"use client";

import type { JSX } from "react";
import { useState } from "react";

import { Check, ChevronDown, Lock, Shield } from "@/components/ui/icons";

import { Card, CardHeader } from "../ui/Card";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Toggle } from "../ui/Toggle";
import { ToneCards } from "../ui/ToneCards";
import type { PrefApiKey, ProviderId, SectionProps } from "../types";
import { findModelMeta, type ModelTag, PROVIDERS, type ProviderEntry } from "./providers";

function ModelTagPill({ tag }: { tag: ModelTag }): JSX.Element {
  const map: Record<ModelTag, string> = {
    flagship: "bg-sky-400/10 text-sky-300 border-sky-400/30",
    balanced: "bg-indigo-400/10 text-indigo-300 border-indigo-400/30",
    fast: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    reasoning: "bg-violet-400/10 text-violet-300 border-violet-400/30",
    open: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    legacy: "bg-slate-700/40 text-slate-400 border-slate-700",
  };
  return (
    <span
      className={
        "inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-medium border uppercase tracking-wide " +
        map[tag]
      }
    >
      {tag}
    </span>
  );
}

function KeyBadge({ keyState }: { keyState: PrefApiKey }): JSX.Element {
  if (!keyState.value) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
        No key
      </span>
    );
  }
  if (!keyState.verified) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
        Unverified
      </span>
    );
  }
  if (!keyState.enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
      <Check size={9} strokeWidth={2.8} />
      Verified
    </span>
  );
}

interface ApiKeyInputProps {
  provider: ProviderEntry;
  keyState: PrefApiKey;
  onPatch: (patch: Partial<PrefApiKey>) => void;
}

function ApiKeyInput({ provider, keyState, onPatch }: ApiKeyInputProps): JSX.Element {
  const [show, setShow] = useState(false);

  return (
    <div className="rounded-md bg-slate-950/60 border border-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-medium text-slate-300 inline-flex items-center gap-1.5">
          <Lock size={11} className="text-slate-400" />
          API key
        </label>
        <span className="text-[10.5px] text-slate-400 inline-flex items-center gap-1">
          Get a key on {provider.docs}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type={show ? "text" : "password"}
            value={keyState.value}
            onChange={(e) => onPatch({ value: e.target.value, verified: false, verifiedAt: null })}
            placeholder={provider.keyHint}
            className="w-full h-9 px-3 pr-9 bg-slate-900 border border-slate-800 rounded-md text-[12px] font-mono text-slate-200 placeholder:text-slate-600 focus:border-slate-700 focus-ring transition-colors"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide key" : "Show key"}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            {show ? "○" : "●"}
          </button>
        </div>
        {/* Verify button rendered but disabled — backend wiring deferred. See FRONTEND_PORT_PLAN.md Appendix B.5. */}
        <button
          type="button"
          disabled
          title="API key verification ships with the backend (TODO)"
          className="h-9 px-3 rounded-md text-[12px] font-semibold bg-slate-800 text-slate-400 cursor-not-allowed"
        >
          Verify
        </button>
      </div>

      {keyState.value && !keyState.verified && (
        <div className="mt-2 text-[10.5px] text-amber-300">
          Key entered — verification will become available when the backend ships.
        </div>
      )}
    </div>
  );
}

interface ProviderModelPickerProps {
  selectedModel: string;
  onSelectModel: (id: string) => void;
  apiKeys: Record<ProviderId, PrefApiKey>;
  patchKey: (provider: ProviderId, patch: Partial<PrefApiKey>) => void;
}

function ProviderModelPicker({
  selectedModel,
  onSelectModel,
  apiKeys,
  patchKey,
}: ProviderModelPickerProps): JSX.Element {
  const initialProvider = findModelMeta(selectedModel)?.provider.id ?? "anthropic";
  const [expandedProvider, setExpandedProvider] = useState<ProviderId | null>(initialProvider);
  const current = findModelMeta(selectedModel);

  return (
    <Card>
      <CardHeader
        title="Model & API keys"
        desc="Bring your own key for any provider. Keys are stored locally and never leave your browser."
      />

      <div className="mx-5 mb-4 p-3.5 rounded-md border border-sky-400/30 bg-sky-400/5 flex items-center gap-3">
        {current && (
          <>
            <div
              className={
                "w-8 h-8 rounded-md bg-gradient-to-br " +
                current.provider.color +
                " flex items-center justify-center text-slate-950 text-[13px] font-bold flex-shrink-0"
              }
            >
              {current.provider.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-semibold text-slate-100">
                  {current.model.name}
                </span>
                <ModelTagPill tag={current.model.tag} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Active model · {current.provider.name}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
              <Check size={9} strokeWidth={3} /> Active
            </span>
          </>
        )}
      </div>

      <div className="px-5 pb-5 space-y-2">
        {PROVIDERS.map((p) => {
          const k = apiKeys[p.id];
          const isExpanded = expandedProvider === p.id;
          const selectedInProvider = current?.provider.id === p.id;
          return (
            <div
              key={p.id}
              className={
                "rounded-md border overflow-hidden transition-colors " +
                (isExpanded
                  ? "border-slate-700 bg-slate-900/60"
                  : "border-slate-800 bg-slate-900/30 hover:border-slate-700")
              }
            >
              <button
                type="button"
                onClick={() => setExpandedProvider(isExpanded ? null : p.id)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left"
              >
                <div
                  className={
                    "w-7 h-7 rounded-md bg-gradient-to-br " +
                    p.color +
                    " flex items-center justify-center text-slate-950 text-[12px] font-bold flex-shrink-0"
                  }
                >
                  {p.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-slate-100">{p.name}</span>
                    {selectedInProvider && (
                      <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {p.models.length} model{p.models.length === 1 ? "" : "s"} · {p.docs}
                  </div>
                </div>
                <KeyBadge keyState={k} />
                <ChevronDown
                  size={13}
                  className={"text-slate-400 transition-transform " + (isExpanded ? "" : "-rotate-90")}
                />
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-slate-800/60">
                  <ApiKeyInput
                    provider={p}
                    keyState={k}
                    onPatch={(patch) => patchKey(p.id, patch)}
                  />
                  <ModelList
                    provider={p}
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/40 flex items-start gap-2.5">
        <Shield size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">Local-only storage.</span> Keys are kept in
          this browser&apos;s storage and sent only to the matching provider&apos;s API.
        </div>
      </div>
    </Card>
  );
}

function ModelList({
  provider,
  selectedModel,
  onSelectModel,
}: {
  provider: ProviderEntry;
  selectedModel: string;
  onSelectModel: (id: string) => void;
}): JSX.Element {
  // Group models by `group` field, preserving original order.
  const groups: { name: string; items: ProviderEntry["models"] }[] = [];
  const seen = new Map<string, number>();
  for (const m of provider.models) {
    const g = m.group || "Models";
    if (!seen.has(g)) {
      seen.set(g, groups.length);
      groups.push({ name: g, items: [] });
    }
    groups[seen.get(g)!].items.push(m);
  }

  return (
    <div className="space-y-3">
      {groups.map((grp) => (
        <div key={grp.name} className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-1">
            {grp.name}
          </div>
          {grp.items.map((m) => {
            const fullId = `${provider.id}/${m.id}`;
            const sel = selectedModel === fullId;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => onSelectModel(fullId)}
                className={
                  "w-full text-left p-3 rounded-md border flex items-start gap-3 transition-all " +
                  (sel
                    ? "border-sky-400/50 bg-sky-400/5"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700")
                }
              >
                <span
                  className={
                    "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 " +
                    (sel ? "border-sky-400 bg-sky-400" : "border-slate-700")
                  }
                >
                  {sel && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] font-semibold text-slate-100">{m.name}</span>
                    <ModelTagPill tag={m.tag} />
                    <code className="text-[10px] text-slate-400 font-mono ml-auto">{fullId}</code>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AiSection({ prefs, update }: SectionProps): JSX.Element {
  const patchKey = (providerId: ProviderId, patch: Partial<PrefApiKey>) => {
    const prev = prefs.apiKeys[providerId];
    update({
      apiKeys: { ...prefs.apiKeys, [providerId]: { ...prev, ...patch } },
    });
  };

  return (
    <Section
      title="Copilot AI"
      desc="How Copilot drafts, summarizes, and revises replies."
    >
      <Card>
        <CardHeader
          title="Default tone"
          desc="The tone the Draft button uses unless you change it inline."
        />
        <div className="px-5 pb-5">
          <ToneCards
            value={prefs.defaultTone}
            onChange={(v) => update({ defaultTone: v })}
          />
        </div>
      </Card>

      <Card>
        <Row
          title="Ask a clarifying question"
          desc="When enabled, drafts include a short clarifying question at the end."
          control={
            <Toggle
              value={prefs.askClarifyingByDefault}
              onChange={(v) => update({ askClarifyingByDefault: v })}
            />
          }
        />
        <Row
          title="Auto-summarize on open"
          desc="Generate a thread summary the moment you open a long thread (8+ messages)."
          control={
            <Toggle
              value={prefs.autoSummarizeOnOpen}
              onChange={(v) => update({ autoSummarizeOnOpen: v })}
            />
          }
        />
        <Row
          title="Let Copilot read full thread"
          desc="Required for accurate summaries. When off, Copilot only sees the latest message."
          control={
            <Toggle
              value={prefs.letCopilotReadAllThreads}
              onChange={(v) => update({ letCopilotReadAllThreads: v })}
            />
          }
          last
        />
      </Card>

      {/* TODO(prefs-backend): ProviderModelPicker stores keys + selection in local state only.
          Persistence + real verify roundtrip ship with the backend. */}
      <ProviderModelPicker
        selectedModel={prefs.selectedModel}
        onSelectModel={(id) => update({ selectedModel: id })}
        apiKeys={prefs.apiKeys}
        patchKey={patchKey}
      />
    </Section>
  );
}
