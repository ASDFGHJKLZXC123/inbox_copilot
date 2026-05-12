// Inbox-scoped formatting helpers. Mirrors mockData.jsx helpers, but as plain TS.

export function smartTimestamp(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMin = (now.getTime() - d.getTime()) / 60_000;
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${Math.round(diffMin)}m`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h`;
  if (diffMin < 60 * 24 * 7) return `${Math.round(diffMin / 60 / 24)}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fullTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function initialOf(label: string): string {
  const m = label.match(/[A-Za-z]/);
  return (m ? m[0] : "?").toUpperCase();
}

// "Name <email>" -> "Name". "email@domain" -> "email".
export function nameOf(participant: string): string {
  const m = participant.match(/^(.*?)\s*<.+>$/);
  if (m && m[1].trim()) return m[1].trim();
  const at = participant.indexOf("@");
  return at >= 0 ? participant.slice(0, at) : participant;
}

export function emailOf(participant: string): string {
  const m = participant.match(/<([^>]+)>/);
  return m ? m[1] : participant;
}

export function avatarHue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
