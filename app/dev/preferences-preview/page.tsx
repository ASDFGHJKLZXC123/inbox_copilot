"use client";

// Dev-only preview route for the preferences page. Renders the component tree
// with synthetic props so reviewers can verify the visual port without going
// through the NextAuth/middleware path.
//
// Guarded by NEXT_PUBLIC_ENABLE_DEV_PREVIEW so prod builds tree-shake it away.
// Set `NEXT_PUBLIC_ENABLE_DEV_PREVIEW=true` in `.env.local` to enable.
// See PHASE_1_SEQUENCING_REVIEW.md option 3.

import { notFound } from "next/navigation";
import type { JSX } from "react";

import { PreferencesPage } from "@/components/preferences/PreferencesPage";
import type { ProviderSubscription } from "@/lib/types";
import type { UiSession } from "@/lib/types-ui";

import "../../preferences/preferences.css";

const SAMPLE_SESSION: UiSession = {
  status: "authenticated",
  user: {
    email: "mira.okafor@gmail.com",
    name: "Mira Okafor",
    initial: "M",
  },
};

const SAMPLE_SUBSCRIPTIONS: ProviderSubscription[] = [
  {
    id: "sub-gmail-1",
    provider: "google",
    email: "mira.okafor@gmail.com",
    notificationUrl: "http://localhost:3000/api/webhooks/google",
    status: "active",
    createdAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 30_000).toISOString(),
  },
];

export default function DevPreferencesPreviewPage(): JSX.Element {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_PREVIEW !== "true") {
    notFound();
  }

  return (
    <div className="preferences-page h-screen w-screen">
      <PreferencesPage
        session={SAMPLE_SESSION}
        onBack={() => {
          // no-op in preview
        }}
        onSignOut={() => {
          // no-op in preview
        }}
        connectedProps={{ subscriptions: SAMPLE_SUBSCRIPTIONS }}
      />
    </div>
  );
}
