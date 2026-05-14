"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Message } from "@/lib/types";
import * as I from "@/components/ui/icons";

import {
  avatarHue,
  emailOf,
  formatBytes,
  fullTimestamp,
  initialOf,
  nameOf,
} from "./helpers";

export interface EmailMessageProps {
  message: Message;
  expanded: boolean;
  onToggle: () => void;
  isFirst?: boolean;
}

// Trusted-sender allowlist. In a real app this would persist; here it's per-tab,
// seeded empty so real users don't get demo-mockup senders silently treated as
// trusted in prod (the prior `["halcyon.io","kestrel.vc","latham.com"]` seed
// came from .archive/email-copilot-mockup/src/mockData.jsx and leaked through the port).
const TRUSTED_SENDERS = new Set<string>();
const TRUSTED_DOMAINS = new Set<string>();

const REMOTE_IMG_RE = /<img\b[^>]*\bsrc\s*=\s*["'](https?:[^"']+)["'][^>]*>/gi;

function stripRemoteImages(html: string): { html: string; blockedCount: number } {
  let count = 0;
  const stripped = html.replace(REMOTE_IMG_RE, () => {
    count++;
    return `<div class="__img_placeholder" style="display:block;border:1px dashed #d4d2cc;background:repeating-linear-gradient(45deg,#f3f1ec,#f3f1ec 6px,#ebe9e3 6px,#ebe9e3 12px);color:#8a8478;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:11px;text-align:center;padding:18px;border-radius:6px;margin:6px 0">Image blocked for privacy</div>`;
  });
  return { html: stripped, blockedCount: count };
}

function buildReaderHtml(html: string, bodyText: string | undefined): string {
  if (bodyText) return bodyText;
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isTrusted(fromEmail: string): boolean {
  if (TRUSTED_SENDERS.has(fromEmail)) return true;
  const domain = fromEmail.split("@")[1]?.toLowerCase();
  if (domain && TRUSTED_DOMAINS.has(domain)) return true;
  return false;
}

export function EmailMessage({ message, expanded, onToggle, isFirst }: EmailMessageProps) {
  void isFirst;
  const fromName = nameOf(message.from);
  const fromEmail = emailOf(message.from);
  const hue = avatarHue(fromEmail);
  const isHtml = !!message.bodyHtml;

  const [viewMode, setViewMode] = useState<"original" | "plain" | "reader">("original");
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(isTrusted(fromEmail));
  const [, forceRerender] = useState(0);

  const allowSender = () => {
    TRUSTED_SENDERS.add(fromEmail);
    setImagesLoaded(true);
    forceRerender((n) => n + 1);
  };
  const allowDomain = () => {
    const d = fromEmail.split("@")[1]?.toLowerCase();
    if (d) TRUSTED_DOMAINS.add(d);
    setImagesLoaded(true);
    forceRerender((n) => n + 1);
  };
  const loadOnce = () => setImagesLoaded(true);

  return (
    <article
      className={"border-b border-slate-900 last:border-b-0 " + (expanded ? "" : "cursor-pointer")}
      onClick={expanded ? undefined : onToggle}
    >
      <header className="px-6 py-4 flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-slate-950 flex-shrink-0 mt-0.5"
          style={{ background: `oklch(0.78 0.13 ${hue})` }}
        >
          {initialOf(fromName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-100">{fromName}</span>
            <span className="text-[11.5px] text-slate-500 font-mono truncate">{fromEmail}</span>
            {isHtml && (
              <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">
                HTML
              </span>
            )}
            <span className="ml-auto text-[11px] text-slate-500 tabular-nums flex-shrink-0">
              {fullTimestamp(message.receivedAt)}
            </span>
          </div>
          <div className="mt-0.5 text-[11.5px] text-slate-500 flex items-center gap-1.5">
            <span>to {message.to.map((t) => nameOf(t)).join(", ")}</span>
          </div>
          {!expanded && (
            <div className="mt-1 text-[12.5px] text-slate-400 line-clamp-1">{message.snippet}</div>
          )}
        </div>
      </header>

      {expanded && (
        <div className="px-6 pb-5">
          {/* View-mode switcher only for HTML email */}
          {isHtml && (
            <div className="pl-11 mb-3 flex items-center gap-2">
              <ViewModeSwitcher
                value={viewMode}
                onChange={setViewMode}
                hasPlain={!!message.bodyText}
              />
              {viewMode === "original" && !imagesLoaded && !isTrusted(fromEmail) && (
                <ImageBlockedPill
                  onLoadOnce={loadOnce}
                  onAllowSender={allowSender}
                  onAllowDomain={allowDomain}
                  fromEmail={fromEmail}
                />
              )}
            </div>
          )}

          {/* Body */}
          {isHtml && viewMode === "original" && message.bodyHtml && (
            <div className="pl-11">
              <HtmlEnvelope html={message.bodyHtml} blockImages={!imagesLoaded} />
            </div>
          )}

          {(viewMode === "plain" || (isHtml && viewMode === "reader") || !isHtml) && (
            <div
              className="pl-11 text-[13.5px] text-slate-200 leading-[1.7] whitespace-pre-wrap"
              style={{ fontFeatureSettings: '"ss01"' }}
            >
              {isHtml
                ? buildReaderHtml(message.bodyHtml ?? "", message.bodyText)
                : message.bodyText ?? message.bodyPreview}
            </div>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="pl-11 mt-4 flex flex-wrap gap-2">
              {message.attachments.map((a, i) => (
                <a
                  key={`${a.filename}-${i}`}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group inline-flex items-center gap-2 h-8 pl-2.5 pr-3 bg-slate-900 border border-slate-800 rounded-md text-[11.5px] hover:border-slate-700 hover:bg-slate-900/80 transition-colors"
                >
                  <I.Paperclip size={12} className="text-slate-500" />
                  <span className="text-slate-200 font-medium">{a.filename}</span>
                  <span className="text-slate-500 tabular-nums">· {formatBytes(a.size)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function HtmlEnvelope({ html, blockImages }: { html: string; blockImages: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(360);

  const processed = useMemo(() => {
    if (blockImages) {
      const { html: stripped } = stripRemoteImages(html);
      return stripped;
    }
    return html;
  }, [html, blockImages]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const body = doc.body;
          const h = Math.max(body.scrollHeight, body.offsetHeight, 240);
          setHeight(Math.min(h + 8, 2400));
        }
      } catch {
        // cross-origin guard
      }
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [processed]);

  return (
    <div className="relative rounded-lg border border-slate-800 bg-slate-950/40 p-3 max-w-[760px] mx-auto">
      <div
        aria-hidden
        className="pointer-events-none absolute left-3 right-3 top-3 h-3 rounded-t-md"
        style={{
          background: "linear-gradient(to bottom, rgba(2,6,23,0.85), transparent)",
        }}
      />
      <div className="rounded-md overflow-hidden ring-1 ring-slate-800/80 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.7)] bg-white">
        <iframe
          ref={iframeRef}
          title="email body"
          srcDoc={processed}
          sandbox="allow-same-origin"
          referrerPolicy="no-referrer"
          className="block w-full bg-white"
          style={{ height: height + "px", border: 0 }}
        />
      </div>
      <div className="mt-2 px-1 flex items-center gap-1.5 text-[10.5px] text-slate-600">
        <I.Lock size={10} />
        <span>Rendered in a sandboxed frame · scripts blocked · external links require confirm</span>
      </div>
    </div>
  );
}

function ViewModeSwitcher({
  value,
  onChange,
  hasPlain,
}: {
  value: "original" | "plain" | "reader";
  onChange: (v: "original" | "plain" | "reader") => void;
  hasPlain: boolean;
}) {
  const modes: { value: "original" | "plain" | "reader"; label: string; disabled?: boolean }[] = [
    { value: "original", label: "Original" },
    { value: "plain", label: "Plain text", disabled: !hasPlain },
    { value: "reader", label: "Reader" },
  ];
  return (
    <div className="inline-flex items-center bg-slate-900/80 border border-slate-800 rounded-md p-0.5 h-7">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => !m.disabled && onChange(m.value)}
          disabled={m.disabled}
          className={
            "px-2.5 h-6 rounded text-[11px] font-medium transition-colors " +
            (value === m.value
              ? "bg-slate-800 text-slate-100"
              : m.disabled
                ? "text-slate-700 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-300")
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function ImageBlockedPill({
  onLoadOnce,
  onAllowSender,
  onAllowDomain,
  fromEmail,
}: {
  onLoadOnce: () => void;
  onAllowSender: () => void;
  onAllowDomain: () => void;
  fromEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const domain = fromEmail.split("@")[1] || "sender";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-200 text-[11px] font-medium hover:bg-amber-400/15 transition-colors"
      >
        <I.Shield size={11} />
        <span>Images blocked</span>
        <I.ChevronDown size={10} className="text-amber-300/70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-40 w-[220px] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl shadow-black/40 overflow-hidden py-1">
            <PillItem
              label="Load once"
              onClick={() => {
                onLoadOnce();
                setOpen(false);
              }}
            />
            <PillItem
              label="Always trust sender"
              subtle
              onClick={() => {
                onAllowSender();
                setOpen(false);
              }}
            />
            <PillItem
              label="Always trust domain"
              subtle
              onClick={() => {
                onAllowDomain();
                setOpen(false);
              }}
            />
            <div className="border-t border-slate-800 mt-1 pt-1">
              <div className="px-3 py-1.5 text-[10.5px] text-slate-500 leading-relaxed">
                Remote images can track when you open mail. Block by default for unknown senders.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PillItem({
  label,
  onClick,
  subtle,
}: {
  label: string;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full text-left px-3 h-7 text-[11.5px] flex items-center transition-colors " +
        (subtle
          ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
          : "text-slate-100 hover:bg-slate-800/60")
      }
    >
      {label}
    </button>
  );
}
