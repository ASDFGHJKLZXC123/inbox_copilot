import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

export const runtime = "nodejs";

const SendSchema = z.object({
  to: z.string().min(1).max(2000),
  cc: z.string().max(2000).optional(),
  bcc: z.string().max(2000).optional(),
  subject: z.string().max(998).default(""),
  body: z.string().max(200_000).default(""),
  threadId: z.string().optional(),
});

function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x7e || value.charCodeAt(i) < 0x20) return false;
  }
  return true;
}

function encodeHeader(value: string): string {
  if (isAscii(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRawMessage(opts: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  from?: string;
}): string {
  const headers: string[] = [];
  if (opts.from) headers.push(`From: ${opts.from}`);
  headers.push(`To: ${opts.to}`);
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.bcc) headers.push(`Bcc: ${opts.bcc}`);
  headers.push(`Subject: ${encodeHeader(opts.subject)}`);
  headers.push("MIME-Version: 1.0");
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push("Content-Transfer-Encoding: 8bit");

  const rfc822 = headers.join("\r\n") + "\r\n\r\n" + opts.body;
  return base64UrlEncode(Buffer.from(rfc822, "utf8"));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token?.accessToken || token.provider !== "google") {
    return NextResponse.json({ error: "Sign in with Google to send messages." }, { status: 401 });
  }

  let parsed;
  try {
    parsed = SendSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }
  const data = parsed.data;

  const fromHeader = typeof token.email === "string" ? token.email : undefined;
  const raw = buildRawMessage({
    to: data.to,
    cc: data.cc,
    bcc: data.bcc,
    subject: data.subject,
    body: data.body,
    from: fromHeader,
  });

  const payload: { raw: string; threadId?: string } = { raw };
  if (data.threadId) payload.threadId = data.threadId;

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    const scopeIssue = res.status === 403 && /insufficient/i.test(text);
    return NextResponse.json(
      {
        error: scopeIssue
          ? "Gmail rejected the request because the access token lacks send permission. Sign out and sign back in to re-grant scope."
          : `Gmail send failed (${res.status}): ${text}`,
      },
      { status: res.status === 401 || res.status === 403 ? res.status : 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
