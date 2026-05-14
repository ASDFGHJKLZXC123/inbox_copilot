"use client";

import { useEffect, useState } from "react";

import type { Reminder } from "@/lib/types";
import { api } from "@/lib/ui/api";
import * as I from "@/components/ui/icons";

import { fullTimestamp } from "./helpers";

export interface ReminderThreadPanelProps {
  selectedThreadId: string | null;
  reminders: Reminder[];
  /**
   * Receives the new full reminders list after the API call resolves.
   * The panel internally calls api.createReminder/completeReminder/deleteReminder
   * and forwards the resulting list. The parent typically wires this to its
   * setReminders state setter.
   */
  onRemindersChange: (next: Reminder[]) => void;
  onError: (message: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function ReminderThreadPanel({
  selectedThreadId,
  reminders,
  onRemindersChange,
  onError,
  open,
  setOpen,
}: ReminderThreadPanelProps) {
  const [dueAt, setDueAt] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const threadReminders = reminders.filter((r) => r.threadId === selectedThreadId);

  useEffect(() => {
    setDueAt("");
    setReason("");
    setPending(false);
  }, [selectedThreadId]);

  const handleAdd = async () => {
    if (!dueAt || !reason.trim() || !selectedThreadId) return;
    setPending(true);
    try {
      const iso = new Date(dueAt).toISOString();
      const next = await api.createReminder({
        threadId: selectedThreadId,
        dueAt: iso,
        reason: reason.trim(),
      });
      onRemindersChange(next);
      setReason("");
      setDueAt("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create reminder";
      onError(message);
    } finally {
      setPending(false);
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      const store = await api.completeReminder(id, { completed });
      onRemindersChange(store.reminders);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update reminder";
      onError(message);
    }
  };

  const remove = async (id: string) => {
    try {
      const store = await api.deleteReminder(id);
      onRemindersChange(store.reminders);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete reminder";
      onError(message);
    }
  };

  const activeCount = threadReminders.filter((r) => !r.completed).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={
          "h-8 px-2.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors border " +
          (activeCount > 0
            ? "bg-amber-400/10 text-amber-200 border-amber-400/30 hover:bg-amber-400/15"
            : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700")
        }
      >
        <I.Bell size={12} />
        <span>Follow-up</span>
        {activeCount > 0 && <span className="tabular-nums">{activeCount}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-40 w-[360px] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center gap-2">
              <I.Bell size={12} className="text-amber-300" />
              <span className="text-[12px] font-semibold text-slate-100">
                Follow-ups on this thread
              </span>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto">
              {threadReminders.length === 0 ? (
                <div className="px-4 py-5 text-center text-[12px] text-slate-400">
                  No follow-ups scheduled on this thread.
                </div>
              ) : (
                <ul className="py-1">
                  {threadReminders.map((r) => (
                    <li
                      key={r.id}
                      className="px-3.5 py-2 flex items-start gap-2.5 hover:bg-slate-800/40"
                    >
                      <button
                        onClick={() => void toggleComplete(r.id, !r.completed)}
                        className={
                          "mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors " +
                          (r.completed
                            ? "bg-emerald-400 border-emerald-400"
                            : "border-slate-600 hover:border-slate-400")
                        }
                        aria-label={r.completed ? "Mark incomplete" : "Mark complete"}
                      >
                        {r.completed && <I.Check size={10} strokeWidth={3} className="text-slate-950" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={
                            "text-[12px] leading-snug " +
                            (r.completed ? "text-slate-400 line-through" : "text-slate-100")
                          }
                        >
                          {r.reason}
                        </div>
                        <div className="text-[10.5px] text-amber-300/80 mt-0.5 flex items-center gap-1">
                          <I.Clock size={9} />
                          {fullTimestamp(r.dueAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => void remove(r.id)}
                        className="text-slate-600 hover:text-rose-300 transition-colors"
                        aria-label="Delete reminder"
                      >
                        <I.X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add form */}
            <div className="px-3.5 py-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
              <div className="text-[10.5px] uppercase tracking-wide text-slate-400 font-medium">
                Add follow-up
              </div>
              <input
                type="text"
                placeholder="What needs to happen?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-md text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-slate-700 focus-ring"
              />
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="flex-1 h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-md text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-slate-700 focus-ring [color-scheme:dark]"
                />
                <button
                  onClick={() => void handleAdd()}
                  disabled={!dueAt || !reason.trim() || pending}
                  className="h-8 px-3 rounded-md bg-amber-300 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-[11.5px] font-semibold transition-colors"
                >
                  {pending ? "Saving…" : "Schedule"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
