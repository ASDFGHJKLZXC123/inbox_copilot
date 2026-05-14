"use client";

import type { SanitizedInboxStore } from "@/lib/types";
import type { UiSession } from "@/lib/types-ui";
import { InboxView } from "@/components/inbox/InboxView";

// Synthetic store hand-built from .archive/email-copilot-mockup/src/mockData.jsx shapes,
// trimmed to two threads/three messages so the screenshot stays focused.
// Shapes mirror lib/types.ts so the same InboxView codepath that renders
// against a real API response renders here.

const NOW = new Date("2026-05-11T14:32:00Z").getTime();
const iso = (offsetMin: number) => new Date(NOW + offsetMin * 60_000).toISOString();

const SESSION: UiSession = {
  status: "authenticated",
  user: {
    email: "mira.okafor@gmail.com",
    name: "Mira Okafor",
    initial: "M",
  },
};

const STORE: SanitizedInboxStore = {
  accounts: [
    {
      id: "acc_1",
      email: "mira.okafor@gmail.com",
      name: "Mira Okafor",
      provider: "google",
      lastSyncedAt: iso(-22),
    },
  ],
  connections: [
    {
      id: "conn_1",
      email: "mira.okafor@gmail.com",
      provider: "google",
      updatedAt: iso(-22),
    },
  ],
  threads: [
    {
      id: "t_acq",
      subject: "Series B term sheet — final markup",
      participants: [
        "Dani Park <dani@kestrel.vc>",
        "Mira Okafor <mira.okafor@gmail.com>",
        "Sam Rhee <sam@kestrel.vc>",
      ],
      messageIds: ["m_acq_1", "m_acq_3"],
      lastMessageAt: iso(-22),
      status: "needs_reply",
    },
    {
      id: "t_lin",
      subject: "RE: Q3 roadmap commitments — eng allocation",
      participants: ["Theo Vance <theo@halcyon.io>", "Mira Okafor <mira.okafor@gmail.com>"],
      messageIds: ["m_lin_1"],
      lastMessageAt: iso(-94),
      status: "needs_reply",
    },
    {
      id: "t_des",
      subject: "Brand refresh — round 2 explorations",
      participants: [
        "Ana Liu <ana@northbeam.studio>",
        "Mira Okafor <mira.okafor@gmail.com>",
      ],
      messageIds: ["m_des_1"],
      lastMessageAt: iso(-180),
      status: "done",
    },
  ],
  messages: [
    {
      id: "m_acq_1",
      threadId: "t_acq",
      subject: "Series B term sheet — final markup",
      from: "Dani Park <dani@kestrel.vc>",
      to: ["mira.okafor@gmail.com"],
      snippet: "Mira — sending the markup over before our call tomorrow.",
      bodyPreview:
        "Mira — sending the markup over before our call tomorrow. A few headline items from our side.",
      bodyText:
        "Mira —\n\nSending the markup over before our call tomorrow. A few headline items from our side:\n\n  • Valuation: $148M pre, $182M post.\n  • Option pool: 18% pre-money refresh.\n  • Liquidation: 1x non-participating, standard.\n  • Board: 2 founder, 2 investor, 1 independent.\n\nThe one I expect pushback on is the pool. Happy to walk through the math.\n\nLet me know if Wednesday 2pm PT still works.\n\n— Dani",
      receivedAt: iso(-1440),
      isUnread: false,
      labels: ["INBOX"],
      attachments: [
        { filename: "Kestrel-TermSheet-v3.pdf", mimeType: "application/pdf", size: 184_220 },
      ],
    },
    {
      id: "m_acq_3",
      threadId: "t_acq",
      subject: "Re: Series B term sheet — final markup",
      from: "Dani Park <dani@kestrel.vc>",
      to: ["mira.okafor@gmail.com"],
      snippet:
        "Latest red-lines attached. We can hold the 18% pool but need movement on the liquidation pref…",
      bodyPreview:
        "Latest red-lines attached. We can hold the 18% pool but need movement on the liquidation pref…",
      bodyText:
        "Latest red-lines attached. We can hold the 18% pool but we need movement on the liquidation preference — 1x non-participating is firm on our side.\n\nOn the independent — right of first nomination with mutual approval works. Send names whenever.\n\nSpeak Wednesday.\n\n— D",
      receivedAt: iso(-22),
      isUnread: true,
      labels: ["INBOX", "IMPORTANT"],
      attachments: [
        {
          filename: "Kestrel-TermSheet-v4-redlined.pdf",
          mimeType: "application/pdf",
          size: 198_440,
        },
      ],
    },
    {
      id: "m_lin_1",
      threadId: "t_lin",
      subject: "Q3 roadmap commitments — eng allocation",
      from: "Theo Vance <theo@halcyon.io>",
      to: ["mira.okafor@gmail.com"],
      snippet: "Mira, here's where I net out on Q3 allocation…",
      bodyPreview:
        "I pushed back on the data-platform scope. We can ship pipelines in Q3 but discovery is Q4.",
      bodyText:
        "Mira,\n\nHere's where I net out on Q3 allocation. Platform: 4 eng on pipelines. Product: 3 eng on the new editor surface. Reliability: 1.5 FTE.\n\nI pushed back on the data-platform scope. We can ship pipelines in Q3 but discovery is honestly a Q4 build.\n\nWant to walk through this Friday?\n\nTheo",
      receivedAt: iso(-94),
      isUnread: true,
      labels: ["INBOX"],
    },
    {
      id: "m_des_1",
      threadId: "t_des",
      subject: "Brand refresh — round 2 explorations",
      from: "Ana Liu <ana@northbeam.studio>",
      to: ["mira.okafor@gmail.com"],
      snippet: "Four directions inside. Direction 2 leans into editorial.",
      bodyPreview:
        "Four directions inside. Direction 2 leans into the editorial type voice we discussed.",
      bodyText:
        "Hi Mira,\n\nFour directions inside the Figma. Direction 2 leans into the editorial type voice we kept coming back to.\n\nWant to do a 30-min react session Thursday?\n\nAna",
      receivedAt: iso(-180),
      isUnread: false,
      labels: ["INBOX"],
    },
  ],
  reminders: [
    {
      id: "r_1",
      threadId: "t_lin",
      dueAt: iso(60 * 24),
      reason: "Follow up with Theo about Q4 milestones",
      completed: false,
    },
  ],
  subscriptions: [
    {
      id: "sub_1",
      provider: "google",
      email: "mira.okafor@gmail.com",
      externalId: "projects/halcyon/topics/inbox-watch",
      notificationUrl: "https://api.email-copilot.dev/webhooks/gmail",
      status: "active",
      expiresAt: iso(60 * 24 * 6),
      createdAt: iso(-60 * 24 * 2),
      updatedAt: iso(-30),
    },
  ],
  webhookEvents: [],
};

export default function InboxPreview() {
  return <InboxView preview={{ store: STORE, session: SESSION }} />;
}
