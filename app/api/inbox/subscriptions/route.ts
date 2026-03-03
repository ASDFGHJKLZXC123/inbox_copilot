import { NextRequest, NextResponse } from "next/server";

import { resolveStoredConnection } from "@/lib/connections";
import { listSubscriptions, upsertSubscription } from "@/lib/db";
import { ProviderType } from "@/lib/types";
import { createProviderSubscription } from "@/providers/subscriptions";

export async function GET(): Promise<NextResponse> {
  const subscriptions = await listSubscriptions();
  return NextResponse.json(subscriptions);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    provider?: ProviderType;
    email?: string;
  };

  if (!body.provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  try {
    const connection = await resolveStoredConnection({
      provider: body.provider,
      email: body.email
    });

    if (!connection?.accessToken) {
      return NextResponse.json(
        {
          error: `No stored OAuth connection found for ${body.provider}. Sign in first so the refresh token can be persisted.`
        },
        { status: 401 }
      );
    }

    const subscription = await createProviderSubscription({
      provider: body.provider,
      email: connection.email,
      accessToken: connection.accessToken
    });

    const store = await upsertSubscription(subscription);
    return NextResponse.json(store.subscriptions);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create provider subscription"
      },
      { status: 502 }
    );
  }
}
