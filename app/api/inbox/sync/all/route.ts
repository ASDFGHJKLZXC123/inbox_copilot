import { NextResponse } from "next/server";

import { resolveStoredConnection } from "@/lib/connections";
import { listConnections, upsertSyncedInbox } from "@/lib/db";
import { syncProviderInbox } from "@/providers/adapters";

export async function POST(): Promise<NextResponse> {
  const connections = await listConnections();

  const results = await Promise.all(
    connections.map(async (connection) => {
      try {
        const activeConnection = await resolveStoredConnection({
          provider: connection.provider,
          email: connection.email
        });

        if (!activeConnection?.accessToken) {
          return {
            email: connection.email,
            provider: connection.provider,
            ok: false,
            error: "No access token available"
          };
        }

        const synced = await syncProviderInbox(connection.provider, connection.email, activeConnection.accessToken);
        await upsertSyncedInbox(synced);

        return {
          email: connection.email,
          provider: connection.provider,
          ok: true,
          threadCount: synced.threads.length,
          messageCount: synced.messages.length
        };
      } catch (error) {
        return {
          email: connection.email,
          provider: connection.provider,
          ok: false,
          error: error instanceof Error ? error.message : "Sync failed"
        };
      }
    })
  );

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    results
  });
}
