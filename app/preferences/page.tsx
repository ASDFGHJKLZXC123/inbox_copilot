"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type JSX } from "react";

import { PreferencesPage } from "@/components/preferences/PreferencesPage";
import { toUiSession } from "@/lib/types-ui";

import "./preferences.css";

// Middleware (B.4) redirects unauthed visits here to /signin?callbackUrl=/preferences.
// So by the time this client component renders, useSession() will either be
// 'authenticated' or 'loading' — the unauthenticated branch is a defensive fallback.
export default function PreferencesRoute(): JSX.Element {
  const { data, status } = useSession();
  const router = useRouter();

  const uiSession = useMemo(() => toUiSession(data ?? null), [data]);

  // ESC → /inbox (per C.4 acceptance).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
        if (target.closest('[role="dialog"]')) return;
      }
      router.push("/inbox");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  if (status === "loading") {
    return (
      <div className="preferences-page h-screen w-screen flex items-center justify-center text-[12.5px] text-slate-400">
        Loading preferences…
      </div>
    );
  }

  if (!uiSession) {
    return (
      <div className="preferences-page h-screen w-screen flex items-center justify-center text-[12.5px] text-slate-400">
        Not signed in.
      </div>
    );
  }

  return (
    <div className="preferences-page h-screen w-screen">
      <PreferencesPage
        session={uiSession}
        onBack={() => router.push("/inbox")}
        onSignOut={() => void signOut({ callbackUrl: "/signin" })}
      />
    </div>
  );
}
