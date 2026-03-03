import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { resolveStoredConnection } from "@/lib/connections";
import { getStore, sanitizeStore, upsertSyncedInbox } from "@/lib/db";
import { ProviderType } from "@/lib/types";
import { syncProviderInbox } from "@/providers/adapters";

export async function GET(): Promise<NextResponse> {
  const store = await getStore();
  return NextResponse.json(sanitizeStore(store));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    provider?: ProviderType;
    email?: string;
    accessToken?: string;
  };

  if (!body.provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const tokenFromSession =
    token?.provider === body.provider || (body.provider === "microsoft" && token?.provider === "microsoft-entra-id")
      ? token.accessToken
      : undefined;

  try {
    const storedConnection = body.accessToken
      ? undefined
      : await resolveStoredConnection({ provider: body.provider, email: body.email });
    const accessToken = body.accessToken ?? tokenFromSession ?? storedConnection?.accessToken;
    const email = body.email ?? storedConnection?.email;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: `No OAuth access token found for ${body.provider}. Sign in with that provider first, or pass an accessToken in the request body.`
        },
        { status: 401 }
      );
    }

    const synced = await syncProviderInbox(body.provider, email, accessToken);
    const store = await upsertSyncedInbox(synced);

    return NextResponse.json(sanitizeStore(store));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
