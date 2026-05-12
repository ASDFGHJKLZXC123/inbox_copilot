import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

export const runtime = "nodejs";

const ModifySchema = z.object({
  action: z.enum(["archive", "trash", "mark-unread", "mark-read"]),
});

async function gmailFetch(
  accessToken: string,
  url: string,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
): Promise<NextResponse> {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token?.accessToken || token.provider !== "google") {
    return NextResponse.json({ error: "Sign in with Google to manage messages." }, { status: 401 });
  }

  const { threadId } = await context.params;

  let parsed;
  try {
    parsed = ModifySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const action = parsed.data.action;

  const base = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}`;
  let url: string;
  let body: Record<string, unknown>;
  switch (action) {
    case "archive":
      url = `${base}/modify`;
      body = { removeLabelIds: ["INBOX"] };
      break;
    case "trash":
      url = `${base}/trash`;
      body = {};
      break;
    case "mark-unread":
      url = `${base}/modify`;
      body = { addLabelIds: ["UNREAD"] };
      break;
    case "mark-read":
      url = `${base}/modify`;
      body = { removeLabelIds: ["UNREAD"] };
      break;
  }

  const res = await gmailFetch(token.accessToken as string, url, body);
  if (!res.ok) {
    const text = await res.text();
    const scopeIssue = res.status === 403 && /insufficient/i.test(text);
    return NextResponse.json(
      {
        error: scopeIssue
          ? "Gmail rejected the request because the access token lacks the gmail.modify scope. Sign out and back in to re-grant."
          : `Gmail ${action} failed (${res.status}): ${text}`,
      },
      { status: res.status === 401 || res.status === 403 ? res.status : 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
