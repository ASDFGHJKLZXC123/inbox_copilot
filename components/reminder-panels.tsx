"use client";

import type { Reminder, Thread } from "@/lib/types";

interface ReminderPanelsProps {
  thread: Thread | null;
  reminders: Reminder[];
  reminderDate: string;
  onReminderDateChange: (value: string) => void;
  reminderReason: string;
  onReminderReasonChange: (value: string) => void;
  onSchedule: () => void;
}

export function ReminderPanels({
  reminders,
  reminderDate,
  onReminderDateChange,
  reminderReason,
  onReminderReasonChange,
  onSchedule,
}: ReminderPanelsProps) {
  return (
    <>
      <div className="panel">
        <p className="panel-label">Follow-up Reminder</p>
        <div className="stack">
          <input
            className="input"
            type="datetime-local"
            value={reminderDate}
            onChange={(e) => onReminderDateChange(e.target.value)}
          />
          <input
            className="input"
            value={reminderReason}
            onChange={(e) => onReminderReasonChange(e.target.value)}
          />
          <button className="button" type="button" onClick={onSchedule}>
            Schedule Follow-up
          </button>
        </div>
      </div>

      <div className="panel">
        <p className="panel-label">Current Reminders</p>
        {reminders.length ? (
          <div className="stack">
            {reminders.map((r) => (
              <div className="reminder" key={r.id}>
                <strong>{new Date(r.dueAt).toLocaleString()}</strong>
                <span>{r.reason}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No follow-up scheduled on this thread.</p>
        )}
      </div>
    </>
  );
}
