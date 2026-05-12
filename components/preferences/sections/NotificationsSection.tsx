"use client";

import type { JSX } from "react";

import { Card, CardHeader } from "../ui/Card";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import type { NotificationsSectionProps } from "../types";

export function NotificationsSection({
  prefs,
  update,
  updateNotify,
}: NotificationsSectionProps): JSX.Element {
  return (
    <Section
      title="Notifications"
      desc="In-app notifications, toasts, and reminder delivery."
    >
      <Card>
        <CardHeader title="Notify me about" />
        <Row
          title="Mentions in incoming mail"
          desc="When someone @-mentions you in a Gmail thread."
          control={
            <Toggle
              value={prefs.notifyOn.mentions}
              onChange={(v) => updateNotify("mentions", v)}
            />
          }
        />
        <Row
          title="Reminders due"
          desc="Follow-ups you've scheduled on threads."
          control={
            <Toggle
              value={prefs.notifyOn.reminders}
              onChange={(v) => updateNotify("reminders", v)}
            />
          }
        />
        <Row
          title="Outgoing send confirmations"
          desc="Toast on every successful send."
          control={
            <Toggle value={prefs.notifyOn.sends} onChange={(v) => updateNotify("sends", v)} />
          }
        />
        <Row
          title="Background sync events"
          desc="Quiet by default; useful for debugging."
          control={
            <Toggle value={prefs.notifyOn.sync} onChange={(v) => updateNotify("sync", v)} />
          }
          last
        />
      </Card>

      <Card>
        <Row
          title="Reminder lead time"
          desc={`Surface reminders ${prefs.reminderLeadTime} minutes before they're due.`}
          control={
            <Slider
              min={0}
              max={120}
              step={5}
              value={prefs.reminderLeadTime}
              suffix=" min"
              onChange={(v) => update({ reminderLeadTime: v })}
            />
          }
        />
        <Row
          title="Toast duration"
          desc="How long success and error toasts stay on screen."
          control={
            <Slider
              min={2}
              max={15}
              step={1}
              value={prefs.toastDuration}
              suffix=" s"
              onChange={(v) => update({ toastDuration: v })}
            />
          }
        />
        <Row
          title="Desktop notifications"
          desc="Show OS-level notifications when this tab is in the background."
          control={
            <Toggle
              value={prefs.desktopNotifications}
              onChange={(v) => update({ desktopNotifications: v })}
            />
          }
          last
        />
      </Card>
    </Section>
  );
}
