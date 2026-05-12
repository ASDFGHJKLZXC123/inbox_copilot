import { Buffer } from "node:buffer";

import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { resolveStoredConnection } from "@/lib/connections";
import { addWebhookEvent, upsertSyncedInbox } from "@/lib/db";
import inboxEmitter from "@/lib/inbox-emitter";
import { logger } from "@/lib/logger";
import { syncProviderInbox } from "@/providers/adapters";

export const runtime = "nodejs";

interface GmailPushEnvelope {
  message?: {
    data?: string;
    messageId?: string;
  };
}

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), {
  cacheMaxAge: 60 * 60 * 1000,
  cooldownDuration: 30 * 1000
});

const VALID_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

async function verifyGoogleOidcJwt(token: string, expectedAudience?: string): Promise<boolean> {
  try {
    await jwtVerify(token, GOOGLE_JWKS, {
      issuer: VALID_ISSUERS,
      audience: expectedAudience,
      algorithms: ["RS256"],
      clockTolerance: 5
    });
    return true;
  } catch (err) {
    if (err instanceof joseErrors.JOSEError) {
      logger.warn({ code: err.code, message: err.message }, "google webhook jwt verify rejected");
    } else {
      logger.warn({ err }, "google webhook jwt verify error");
    }
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : undefined;

  if (!bearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedAudience = process.env.GOOGLE_PUBSUB_AUDIENCE || process.env.GOOGLE_PUSH_ENDPOINT || undefined;
  const verified = await verifyGoogleOidcJwt(bearer, expectedAudience);
  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      const resolvedEmail = connection.email;
      const synced = await syncProviderInbox("google", resolvedEmail, connection.accessToken, "inbox");
      await upsertSyncedInbox(synced);
      inboxEmitter.emit("sync", { type: "sync", provider: "google", email: resolvedEmail });
    }
  } catch (err) {
    logger.error({ err, email: payload.emailAddress }, "google webhook sync failed");
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
