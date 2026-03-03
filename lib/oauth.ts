import { ProviderType } from "@/lib/types";

export type AuthProviderId = ProviderType | "microsoft-entra-id";

export function normalizeProvider(provider?: string): ProviderType | undefined {
  if (provider === "google") {
    return "google";
  }

  if (provider === "microsoft" || provider === "microsoft-entra-id") {
    return "microsoft";
  }

  return undefined;
}

export async function refreshProviderAccessToken(input: {
  provider: ProviderType;
  refreshToken: string;
}): Promise<{
  accessToken: string;
  accessTokenExpires: number;
  refreshToken: string;
}> {
  if (input.provider === "google") {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: input.refreshToken
      })
    });

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };

    if (!response.ok || !payload.access_token) {
      throw new Error(payload.error || "Google token refresh failed");
    }

    return {
      accessToken: payload.access_token,
      accessTokenExpires: Date.now() + (payload.expires_in ?? 3600) * 1000,
      refreshToken: payload.refresh_token ?? input.refreshToken
    };
  }

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
      scope: "openid profile email offline_access User.Read Mail.Read"
    })
  });

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || "Microsoft token refresh failed");
  }

  return {
    accessToken: payload.access_token,
    accessTokenExpires: Date.now() + (payload.expires_in ?? 3600) * 1000,
    refreshToken: payload.refresh_token ?? input.refreshToken
  };
}
