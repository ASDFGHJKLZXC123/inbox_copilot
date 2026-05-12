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

export default async function DevInboxPreviewPage() {
  // process.env.NEXT_PUBLIC_* is inlined at build time, so when the env var
  // is not "true" the entire body becomes the unconditional notFound() call
  // and the dynamic import is dead code that webpack can DCE.
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_PREVIEW !== "true") {
    notFound();
  }
  const { default: InboxPreview } = await import("./preview.client");
  return <InboxPreview />;
}
