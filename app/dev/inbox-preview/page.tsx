// Dev-only preview route. Renders <InboxView /> with synthetic props so the
// inbox surface can be verified without an authenticated NextAuth session.
//
// Guard: NEXT_PUBLIC_ENABLE_DEV_PREVIEW must be "true" at build time or this
// route 404s. Both prod and unaware dev builds tree-shake the synthetic data
// path out (dead-code elimination on the env-string check).
//
// Per PHASE_1_SEQUENCING_REVIEW.md "visual smoke (option b)".

import { notFound } from "next/navigation";

import "@/app/inbox/inbox.css";
import InboxPreview from "./preview.client";

export default function DevInboxPreviewPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_PREVIEW !== "true") {
    notFound();
  }
  return <InboxPreview />;
}
