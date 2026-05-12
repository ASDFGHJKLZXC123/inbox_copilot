import type { ReactNode } from "react";
import "./inbox.css";

export const metadata = { title: "AI Inbox Copilot" };

export default function InboxLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {children}
    </>
  );
}
