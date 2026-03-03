import { Buffer } from "node:buffer";

import { NextRequest, NextResponse } from "next/server";

import { resolveStoredConnection } from "@/lib/connections";
import { addWebhookEvent, upsertSyncedInbox } from "@/lib/db";
import { syncProviderInbox } from "@/providers/adapters";

export const runtime = "nodejs";

interface GmailPushEnvelope {
  message?: {
    data?: string;
    messageId?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as GmailPushEnvelope;
  const encoded = body.message?.data;

  if (!encoded) {
    await addWebhookEvent({
      id: `google_event_${Date.now()}`,
      provider: "google",
      receivedAt: new Date().toISOString(),
      eventType: "empty",
      note: "Missing Pub/Sub payload"
    });
    return NextResponse.json({ ok: true });
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as {
    emailAddress?: string;
    historyId?: string;
  };

  await addWebhookEvent({
    id: `google_event_${body.message?.messageId ?? Date.now()}`,
    provider: "google",
    email: payload.emailAddress,
    receivedAt: new Date().toISOString(),
    eventType: "push",
    note: payload.historyId ? `historyId ${payload.historyId}` : undefined
  });

  try {
    const connection = await resolveStoredConnection({
      provider: "google",
      email: payload.emailAddress
    });

    if (connection?.accessToken) {
      const synced = await syncProviderInbox("google", connection.email, connection.accessToken);
      await upsertSyncedInbox(synced);
    }
  } catch {
    await addWebhookEvent({
      id: `google_event_error_${Date.now()}`,
      provider: "google",
      email: payload.emailAddress,
      receivedAt: new Date().toISOString(),
      eventType: "sync_error",
      note: "Webhook-triggered sync failed"
    });
  }

  return NextResponse.json({ ok: true });
}
