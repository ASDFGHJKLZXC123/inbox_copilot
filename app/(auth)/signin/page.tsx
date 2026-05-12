"use client";

import { signIn } from "next-auth/react";
import type { JSX } from "react";

import { SignInGate } from "@/components/auth/SignInGate";

import "./signin.css";

// Public route. Middleware (B.4) sends unauthed visits to /inbox or /preferences
// here with a ?callbackUrl=<original-path> param; we forward that into signIn.
export default function SignInPage(): JSX.Element {
  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA;
  const buildLabel = buildSha ? `build ${buildSha}` : undefined;

  return (
    <div className="signin-page h-screen w-screen">
      <SignInGate
        onSignIn={() => {
          const callbackUrl =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("callbackUrl") ?? "/inbox"
              : "/inbox";
          void signIn("google", { callbackUrl });
        }}
        buildLabel={buildLabel}
      />
    </div>
  );
}
