"use client";

import { signIn } from "next-auth/react";
import type { Session } from "next-auth";

interface HeroSectionProps {
  session: Session | null;
  sessionStatus: "authenticated" | "loading" | "unauthenticated";
}

export function HeroSection({ session, sessionStatus }: HeroSectionProps) {
  return (
    <section className="hero">
      <p className="eyebrow">AI Inbox Copilot</p>
      <div className="hero-grid">
        <div>
          <h1>Clear the inbox with summaries, drafts, reminders, and fast search.</h1>
          <p className="subtle">
            OAuth is wired with Auth.js for Google and Microsoft, inbox sync is stored locally,
            and the copilot layer is structured so real provider APIs and embeddings can drop in
            next.
          </p>
        </div>
        <div className="auth-card">
          <p>OAuth sign-in</p>
          <div className="stack">
            <button onClick={() => signIn("google")} className="secondary-button" type="button">
              Connect Google
            </button>
          </div>
          <p className="muted">
            {sessionStatus === "authenticated"
              ? `Signed in as ${session?.user?.email ?? "unknown"} via ${session?.user?.provider ?? "provider"}.`
              : "Set Google client IDs in `.env.local`, then sign in before syncing a live inbox."}
          </p>
          {session?.authError ? (
            <p className="muted">Auth token refresh issue: {session.authError}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
