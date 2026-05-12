import { NextRequest, NextResponse } from "next/server";

import { resolveStoredConnection } from "@/lib/connections";
import { addWebhookEvent, getSubscriptionByExternalId, upsertSyncedInbox } from "@/lib/db";
import inboxEmitter from "@/lib/inbox-emitter";
import { logger } from "@/lib/logger";
import { syncProviderInbox } from "@/providers/adapters";

export const runtime = "nodejs";

interface GraphNotification {
  subscriptionId?: string;
  changeType?: string;
  clientState?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const validationToken = request.nextUrl.searchParams.get("validationToken");

  if (!validationToken) {
    return new NextResponse("Missing validationToken", { status: 400 });
  }

  return new NextResponse(validationToken, {
    status: 200,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as { value?: GraphNotification[] };
  const notifications = body.value ?? [];

  for (const notification of notifications) {
    const subscription = notification.subscriptionId
      ? await getSubscriptionByExternalId("microsoft", notification.subscriptionId)
      : undefined;

    if (subscription?.clientState && subscription.clientState !== notification.clientState) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await addWebhookEvent({
      id: `microsoft_event_${notification.subscriptionId ?? Date.now()}`,
      provider: "microsoft",
      email: subscription?.email,
      receivedAt: new Date().toISOString(),
      eventType: notification.changeType ?? "push",
      note: notification.subscriptionId
    });

    if (!subscription?.email) {
      continue;
    }

    try {
      const connection = await resolveStoredConnection({
        provider: "microsoft",
        email: subscription.email
      });

      if (!connection?.accessToken) {
        continue;
      }

      const resolvedEmail = connection.email;
      const synced = await syncProviderInbox("microsoft", resolvedEmail, connection.accessToken);
      await upsertSyncedInbox(synced);
      inboxEmitter.emit("sync", { type: "sync", provider: "microsoft", email: resolvedEmail });
    } catch (err) {
      logger.error({ err, email: subscription.email }, "microsoft webhook sync failed");
      await addWebhookEvent({
        id: `microsoft_event_error_${Date.now()}`,
        provider: "microsoft",
        email: subscription.email,
        receivedAt: new Date().toISOString(),
        eventType: "sync_error",
        note: notification.subscriptionId
      });
    }
  }

  return NextResponse.json({ ok: true });
}
