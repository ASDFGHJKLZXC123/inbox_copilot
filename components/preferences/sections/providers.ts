// Provider/model catalogue — ported from mockup `.archive/email-copilot-mockup/src/PreferencesPage.jsx`
// lines 265-435. Kept in a separate module so AiSection stays readable. The list
// is the mockup's source of truth; the live app does not currently route
// requests to these providers (TODO(prefs-backend)).

import type { ProviderId } from "../types";

export type ModelTag = "flagship" | "balanced" | "fast" | "reasoning" | "open" | "legacy";

export interface ProviderModel {
  id: string;
  name: string;
  group: string;
  tag: ModelTag;
  desc: string;
}

export interface ProviderEntry {
  id: ProviderId;
  name: string;
  initial: string;
  color: string;
  docs: string;
  keyHint: string;
  models: ProviderModel[];
}

export const PROVIDERS: ProviderEntry[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    initial: "A",
    color: "from-orange-400 to-amber-500",
    docs: "console.anthropic.com",
    keyHint: "sk-ant-…",
    models: [
      { id: "claude-opus-4-7", name: "Claude Opus 4.7", group: "Claude 4.7", tag: "flagship", desc: "April 2026 flagship · 1M context · xhigh reasoning · 87.6% SWE-bench Verified." },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", group: "Claude 4.6", tag: "flagship", desc: "Adaptive Thinking · GA · still strong for premium reasoning." },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", group: "Claude 4.6", tag: "balanced", desc: "Default daily driver · Opus-level coding at Sonnet pricing." },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", group: "Claude 4.5", tag: "balanced", desc: "Sept 2025 · long-horizon agents and computer use." },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", group: "Claude 4.5", tag: "fast", desc: "Fastest current Claude · best for drafts and subagents." },
      { id: "claude-opus-4-1", name: "Claude Opus 4.1", group: "Claude 4", tag: "legacy", desc: "Agentic search and long-horizon tasks. Retirement ≥ Aug 2026." },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", group: "Claude 4", tag: "legacy", desc: "Balanced legacy Sonnet. Retirement ≥ May 2026." },
      { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku", group: "Claude 3.5", tag: "legacy", desc: "Lightweight legacy model for moderation and instruction following." },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    initial: "O",
    color: "from-emerald-400 to-teal-500",
    docs: "platform.openai.com",
    keyHint: "sk-proj-…",
    models: [
      { id: "gpt-5.5", name: "GPT-5.5", group: "GPT-5.5", tag: "flagship", desc: "April 2026 flagship · 1M context · tool search, computer use, MCP." },
      { id: "gpt-5.5-pro", name: "GPT-5.5 pro", group: "GPT-5.5", tag: "reasoning", desc: "Extra compute via Responses API for the hardest problems." },
      { id: "gpt-5.4", name: "GPT-5.4", group: "GPT-5.4", tag: "balanced", desc: "Production default. Strong reasoning and Codex-class coding." },
      { id: "gpt-5.4-mini", name: "GPT-5.4 mini", group: "GPT-5.4", tag: "fast", desc: "Lower-latency / lower-cost workhorse for high-volume use." },
      { id: "gpt-5.4-nano", name: "GPT-5.4 nano", group: "GPT-5.4", tag: "fast", desc: "Cheapest GPT-5 class. Simple speed-sensitive tasks." },
      { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", group: "Codex", tag: "reasoning", desc: "Agentic coding model. Long-running tasks in Codex/Cursor/Replit." },
      { id: "gpt-5.1-codex", name: "GPT-5.1 Codex", group: "Codex", tag: "reasoning", desc: "Earlier coding-optimised checkpoint, still production-ready." },
      { id: "gpt-5", name: "GPT-5", group: "GPT-5", tag: "legacy", desc: "August 2025 launch. Still available via API." },
      { id: "gpt-5-mini", name: "GPT-5 mini", group: "GPT-5", tag: "legacy", desc: "Smaller original GPT-5." },
      { id: "gpt-5-nano", name: "GPT-5 nano", group: "GPT-5", tag: "legacy", desc: "Smallest original GPT-5." },
      { id: "gpt-4.1", name: "GPT-4.1", group: "GPT-4.1", tag: "legacy", desc: "Strong general-purpose legacy model." },
      { id: "gpt-4.1-mini", name: "GPT-4.1 mini", group: "GPT-4.1", tag: "legacy", desc: "Cheaper 4.1 variant for narrow tasks." },
      { id: "gpt-4.1-nano", name: "GPT-4.1 nano", group: "GPT-4.1", tag: "legacy", desc: "Smallest 4.1 model." },
      { id: "gpt-4o", name: "GPT-4o", group: "GPT-4o", tag: "legacy", desc: "Omni model. Lower-cost compatibility option." },
      { id: "gpt-4o-mini", name: "GPT-4o mini", group: "GPT-4o", tag: "legacy", desc: "Smaller 4o. Cheapest legacy chat model." },
      { id: "o3", name: "o3", group: "o-series", tag: "reasoning", desc: "High-effort chain-of-thought reasoner." },
      { id: "o3-mini", name: "o3-mini", group: "o-series", tag: "reasoning", desc: "Smaller reasoner. Faster and cheaper." },
      { id: "o1", name: "o1", group: "o-series", tag: "legacy", desc: "First-gen reasoner. Kept for compatibility." },
      { id: "gpt-oss-120b", name: "gpt-oss-120b", group: "Open weights", tag: "open", desc: "Open-weight (Apache 2.0). Self-host or hosted API." },
      { id: "gpt-oss-20b", name: "gpt-oss-20b", group: "Open weights", tag: "open", desc: "Smaller open-weight variant." },
    ],
  },
  {
    id: "google",
    name: "Google",
    initial: "G",
    color: "from-sky-400 to-indigo-500",
    docs: "aistudio.google.com",
    keyHint: "AIza…",
    models: [
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", group: "Gemini 3.1", tag: "flagship", desc: "April 2026 flagship · 1M context · adaptive thinking · grounding." },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", group: "Gemini 3.1", tag: "fast", desc: "Cheapest current model. Low-latency, high-volume tasks." },
      { id: "gemini-3-pro", name: "Gemini 3 Pro", group: "Gemini 3", tag: "balanced", desc: "Nov 2025 reasoning-first model. Strong on agentic workflows." },
      { id: "gemini-3-flash", name: "Gemini 3 Flash", group: "Gemini 3", tag: "balanced", desc: "Dec 2025 Flash. Frontier-class quality at Flash speed." },
      { id: "gemini-3-deep-think", name: "Gemini 3 Deep Think", group: "Gemini 3", tag: "reasoning", desc: "Extended thinking variant for the hardest reasoning tasks." },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", group: "Gemini 2.5", tag: "legacy", desc: "GA · stable. Adaptive thinking + 1M context." },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", group: "Gemini 2.5", tag: "legacy", desc: "GA · stable Flash with controllable thinking budgets." },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", group: "Gemini 2.5", tag: "legacy", desc: "GA · cheap, low-latency. Popular for mobile/embedded." },
      { id: "gemma-4", name: "Gemma 4", group: "Open · Gemma", tag: "open", desc: "Open-weight. Reasoning, coding, multimodal (E2B/E4B add audio)." },
      { id: "gemma-3", name: "Gemma 3", group: "Open · Gemma", tag: "open", desc: "Open-weight. Text + image, 140+ languages, 128K context." },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    initial: "X",
    color: "from-slate-300 to-slate-500",
    docs: "console.x.ai",
    keyHint: "xai-…",
    models: [
      { id: "grok-4", name: "Grok 4", group: "Grok 4", tag: "flagship", desc: "Frontier reasoning. Real-time data hooks." },
      { id: "grok-4-heavy", name: "Grok 4 Heavy", group: "Grok 4", tag: "reasoning", desc: "Multi-agent variant for the hardest problems." },
      { id: "grok-4-fast", name: "Grok 4 Fast", group: "Grok 4", tag: "fast", desc: "Lower-latency Grok 4 for production traffic." },
      { id: "grok-3", name: "Grok 3", group: "Grok 3", tag: "legacy", desc: "Previous-generation flagship." },
      { id: "grok-3-mini", name: "Grok 3 mini", group: "Grok 3", tag: "legacy", desc: "Smaller Grok 3." },
      { id: "grok-code-fast", name: "Grok Code Fast", group: "Coding", tag: "fast", desc: "Coding-tuned, low-latency variant." },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    initial: "M",
    color: "from-amber-400 to-rose-500",
    docs: "console.mistral.ai",
    keyHint: "mr-…",
    models: [
      { id: "mistral-large-2-1", name: "Mistral Large 2.1", group: "Premier", tag: "flagship", desc: "Frontier reasoning. Strong on European languages." },
      { id: "mistral-medium-3", name: "Mistral Medium 3", group: "Premier", tag: "balanced", desc: "Good price/quality balance for general use." },
      { id: "mistral-small-3-2", name: "Mistral Small 3.2", group: "Premier", tag: "fast", desc: "Smaller, faster, cheaper." },
      { id: "magistral-medium", name: "Magistral Medium", group: "Reasoning", tag: "reasoning", desc: "Reasoning-specialised model with extended thinking." },
      { id: "codestral-2", name: "Codestral 2", group: "Coding", tag: "fast", desc: "Coding-specialised, optimised for low latency." },
      { id: "pixtral-large", name: "Pixtral Large", group: "Vision", tag: "balanced", desc: "Multimodal flagship for image + text understanding." },
      { id: "ministral-8b", name: "Ministral 8B", group: "Edge", tag: "open", desc: "Open-weight edge model." },
      { id: "ministral-3b", name: "Ministral 3B", group: "Edge", tag: "open", desc: "Smallest edge model. Mobile/on-device." },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    initial: "D",
    color: "from-violet-400 to-fuchsia-500",
    docs: "platform.deepseek.com",
    keyHint: "sk-…",
    models: [
      { id: "deepseek-v4", name: "DeepSeek V4", group: "V-series", tag: "flagship", desc: "April 2026 flagship. Top-tier price-performance." },
      { id: "deepseek-v3.5", name: "DeepSeek V3.5", group: "V-series", tag: "balanced", desc: "Very low cost. Solid quality on drafts and summaries." },
      { id: "deepseek-v3.2", name: "DeepSeek V3.2", group: "V-series", tag: "legacy", desc: "Previous-gen V-series. Strong cost efficiency." },
      { id: "deepseek-r2", name: "DeepSeek R2", group: "Reasoner", tag: "reasoning", desc: "Chain-of-thought reasoner. Best for revisions." },
      { id: "deepseek-r1", name: "DeepSeek R1", group: "Reasoner", tag: "legacy", desc: "Original open-weights reasoner." },
      { id: "deepseek-coder-v2", name: "DeepSeek Coder V2", group: "Coding", tag: "fast", desc: "Coding-tuned. Strong on HumanEval / MBPP." },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    initial: "C",
    color: "from-pink-400 to-rose-500",
    docs: "dashboard.cohere.com",
    keyHint: "co-…",
    models: [
      { id: "command-a", name: "Command A", group: "Command A", tag: "flagship", desc: "Enterprise-tuned flagship. Strong on structured replies." },
      { id: "command-a-vision", name: "Command A Vision", group: "Command A", tag: "balanced", desc: "Vision variant with image-grounded reasoning." },
      { id: "command-a-reasoning", name: "Command A Reasoning", group: "Command A", tag: "reasoning", desc: "Reasoning-tuned. Extended thinking budgets." },
      { id: "command-r-plus", name: "Command R+", group: "Command R", tag: "legacy", desc: "RAG-tuned. Reliable retrieval and citation behaviour." },
      { id: "command-r", name: "Command R", group: "Command R", tag: "legacy", desc: "Lighter retrieval-focused option." },
      { id: "command-r7b", name: "Command R7B", group: "Command R", tag: "fast", desc: "Smallest Command R. Fast and cheap." },
      { id: "aya-expanse-32b", name: "Aya Expanse 32B", group: "Aya", tag: "open", desc: "Multilingual. 23 languages, open-weight friendly." },
      { id: "aya-expanse-8b", name: "Aya Expanse 8B", group: "Aya", tag: "open", desc: "Smaller Aya for edge / on-device." },
    ],
  },
  {
    id: "meta",
    name: "Meta · Llama",
    initial: "L",
    color: "from-blue-400 to-indigo-500",
    docs: "llama.developer.meta.com",
    keyHint: "LLM|…",
    models: [
      { id: "llama-4-behemoth", name: "Llama 4 Behemoth", group: "Llama 4", tag: "flagship", desc: "Largest Llama 4 (~2T params, MoE). Significant hardware required." },
      { id: "llama-4-maverick", name: "Llama 4 Maverick", group: "Llama 4", tag: "flagship", desc: "400B-param MoE. Open-weights flagship; self-host or hosted API." },
      { id: "llama-4-scout", name: "Llama 4 Scout", group: "Llama 4", tag: "balanced", desc: "109B-param MoE. Long-context friendly." },
      { id: "llama-3-3-70b", name: "Llama 3.3 70B", group: "Llama 3", tag: "legacy", desc: "Strong 70B legacy text model." },
      { id: "llama-3-2-90b-vision", name: "Llama 3.2 90B Vision", group: "Llama 3", tag: "legacy", desc: "Vision-capable Llama 3.2." },
      { id: "llama-3-2-11b-vision", name: "Llama 3.2 11B Vision", group: "Llama 3", tag: "legacy", desc: "Smaller vision variant." },
      { id: "llama-3-2-3b", name: "Llama 3.2 3B", group: "Llama 3", tag: "fast", desc: "Tiny edge model for mobile/on-device." },
    ],
  },
];

export interface ModelMeta {
  provider: ProviderEntry;
  model: ProviderModel;
}

export function findModelMeta(modelId: string): ModelMeta | null {
  for (const p of PROVIDERS) {
    const m = p.models.find((mm) => `${p.id}/${mm.id}` === modelId);
    if (m) return { provider: p, model: m };
  }
  return null;
}
