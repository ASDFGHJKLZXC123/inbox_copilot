"use client";

import { useState } from "react";
import { ArrowUUpLeft, DotsThree, DotsThreeVertical } from "@phosphor-icons/react";

export interface EmailMessageData {
  id: string;
  senderName: string;
  senderInitials: string;
  senderInitialsColor?: string;
  senderAvatarUrl?: string;
  to: string;
  time: string;
  preview: string;
  body?: string[];
  signature?: string[];
  isExpanded?: boolean;
  isLatest?: boolean;
}

interface EmailMessageProps {
  message: EmailMessageData;
}

function Avatar({ message }: { message: EmailMessageData }) {
  if (message.senderAvatarUrl) {
    return (
      <img
        src={message.senderAvatarUrl}
        alt={message.senderName}
        className="w-10 h-10 rounded-full"
      />
    );
  }
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
        message.senderInitialsColor ?? "bg-slate-200 text-slate-600"
      }`}
    >
      {message.senderInitials}
    </div>
  );
}

export function EmailMessage({ message }: EmailMessageProps) {
  const [expanded, setExpanded] = useState(message.isExpanded ?? message.isLatest ?? false);

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <div className="px-5 py-3 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Avatar message={{ ...message, senderInitialsColor: message.senderInitialsColor ?? "bg-slate-200 text-slate-600" }} />
            <div>
              <span className="font-semibold text-slate-900 text-sm">{message.senderName}</span>
              <span className="text-slate-500 text-sm ml-1">{message.to}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{message.time}</span>
            <DotsThree size={20} />
          </div>
        </div>
        <div className="px-5 py-2 text-sm text-slate-500 truncate">{message.preview}</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden relative">
      {/* Blue left accent for latest message */}
      {message.isLatest && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />}

      <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar message={{ ...message, senderInitialsColor: message.senderInitialsColor }} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{message.senderName}</h3>
              <span className="text-xs text-slate-500">&lt;{message.senderName.toLowerCase().replace(" ", ".")}@company.com&gt;</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{message.to}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{message.time}</span>
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
              title="Reply"
            >
              <ArrowUUpLeft size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
              title="More"
            >
              <DotsThreeVertical size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 text-slate-800 text-sm leading-relaxed space-y-4">
        {message.body?.map((para, i) => <p key={i}>{para}</p>)}
        {message.signature && (
          <div className="mt-4 text-slate-500">
            {message.signature.map((line, i) => (
              <p key={i} className={i === 1 ? "font-medium" : ""}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
