import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { parseBody } from "@/lib/api";
import { resolveStoredConnection } from "@/lib/connections";
import { getStore, sanitizeStore, upsertSyncedInbox } from "@/lib/db";
import { SyncRequestSchema } from "@/lib/schemas";
import { syncProviderInbox } from "@/providers/adapters";

export async function GET(): Promise<NextResponse> {
  const store = await getStore();
  return NextResponse.json(sanitizeStore(store));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = await parseBody(request, SyncRequestSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const tokenFromSession =
    token?.provider === body.provider || (body.provider === "microsoft" && token?.provider === "microsoft-entra-id")
      ? token.accessToken
      : undefined;

  try {
    const storedConnection = await resolveStoredConnection({
      provider: body.provider,
      email: body.email
    });
    const accessToken = tokenFromSession ?? storedConnection?.accessToken;
    const email = body.email ?? storedConnection?.email;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: `No OAuth access token found for ${body.provider}. Sign in with that provider first.`
        },
        { status: 401 }
      );
    }

    const synced = await syncProviderInbox(body.provider, email, accessToken, body.label);
    const fullStore = await upsertSyncedInbox(synced);
    const sanitized = sanitizeStore(fullStore);

    // Only return the threads/messages just synced for this label, so the client
    // doesn't see leftover threads from previous syncs of other folders.
    return NextResponse.json({
      ...sanitized,
      threads: synced.threads,
      messages: synced.messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
