"use client";

import { useState } from "react";
import {
  ArrowsClockwise,
  ArrowsInSimple,
  Briefcase,
  CaretDown,
  Copy,
  Link,
  Paperclip,
  PaperPlaneRight,
  Smiley,
  Sparkle,
  TextAa,
} from "@phosphor-icons/react";

interface ReplyComposerProps {
  placeholder: string;
  initialDraft?: string;
  recipientNames: string;
}

export function ReplyComposer({ placeholder, initialDraft = "", recipientNames }: ReplyComposerProps) {
  const [body, setBody] = useState(initialDraft);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20 font-sans">
      <div className="max-w-4xl mx-auto p-4">
        <div className="border border-slate-300 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all overflow-hidden flex flex-col">

          {/* Draft toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-ai-700 bg-ai-100 px-2 py-1 rounded flex items-center gap-1 mr-2">
                <Sparkle size={11} weight="fill" /> Copilot Draft
              </span>
              <button className="text-xs font-medium text-slate-600 hover:bg-slate-200 px-2 py-1 rounded transition-colors flex items-center gap-1">
                <ArrowsInSimple size={12} /> Make Shorter
              </button>
              <button className="text-xs font-medium text-slate-600 hover:bg-slate-200 px-2 py-1 rounded transition-colors flex items-center gap-1">
                <Briefcase size={12} /> More Professional
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button className="text-xs font-medium text-slate-600 hover:bg-slate-200 px-2 py-1 rounded transition-colors flex items-center gap-1" title="Regenerate Draft">
                <ArrowsClockwise size={12} />
              </button>
            </div>
            <button className="text-xs font-medium text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors flex items-center gap-1">
              <Copy size={12} /> Copy Text
            </button>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-4 text-sm text-slate-800 placeholder-slate-400 bg-transparent border-none focus:ring-0 resize-none min-h-[120px] outline-none"
              placeholder={`Reply to ${recipientNames}...`}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-white flex justify-between items-center border-t border-slate-100">
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Formatting">
                <TextAa size={18} />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Attach file">
                <Paperclip size={18} />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Insert link">
                <Link size={18} />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Insert emoji">
                <Smiley size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBody("")}
                className="text-slate-500 hover:text-slate-800 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-100 transition-colors"
              >
                Discard
              </button>
              <div className="flex rounded-md shadow-sm">
                <button className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-5 py-2 rounded-l-md transition-colors flex items-center gap-2">
                  Send <PaperPlaneRight size={14} />
                </button>
                <button className="bg-brand-700 hover:bg-brand-600 text-white px-2 py-2 rounded-r-md border-l border-brand-500 transition-colors">
                  <CaretDown size={14} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
