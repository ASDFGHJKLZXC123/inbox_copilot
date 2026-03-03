import { getConnection, upsertConnection } from "@/lib/db";
import { refreshProviderAccessToken } from "@/lib/oauth";
import { OAuthConnection, ProviderType } from "@/lib/types";

export async function resolveStoredConnection(input: {
  provider: ProviderType;
  email?: string;
}): Promise<OAuthConnection | undefined> {
  const connection = await getConnection(input);
  if (!connection) {
    return undefined;
  }

  const expiresSoon =
    typeof connection.accessTokenExpires === "number" && Date.now() > connection.accessTokenExpires - 60_000;

  if (!expiresSoon) {
    return connection;
  }

  if (!connection.refreshToken) {
    return connection;
  }

  const refreshed = await refreshProviderAccessToken({
    provider: connection.provider,
    refreshToken: connection.refreshToken
  });

  const nextConnection: OAuthConnection = {
    ...connection,
    accessToken: refreshed.accessToken,
    accessTokenExpires: refreshed.accessTokenExpires,
    refreshToken: refreshed.refreshToken,
    updatedAt: new Date().toISOString()
  };

  await upsertConnection(nextConnection);
  return nextConnection;
}
