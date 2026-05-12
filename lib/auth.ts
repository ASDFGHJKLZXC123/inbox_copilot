import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { upsertConnection } from "@/lib/db";
import { normalizeProvider, refreshProviderAccessToken } from "@/lib/oauth";

const providers: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.modify",
          access_type: "offline",
          prompt: "consent"
        }
      }
    })
  );
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email offline_access User.Read Mail.Read"
        }
      }
    })
  );
}

async function persistConnectionFromToken(token: JWT): Promise<void> {
  const provider = normalizeProvider(typeof token.provider === "string" ? token.provider : undefined);
  const email = typeof token.email === "string" ? token.email : undefined;

  if (!provider || !email) {
    return;
  }

  await upsertConnection({
    id: `${provider}:${email.toLowerCase()}`,
    email,
    provider,
    accessToken: typeof token.accessToken === "string" ? token.accessToken : undefined,
    refreshToken: typeof token.refreshToken === "string" ? token.refreshToken : undefined,
    accessTokenExpires: typeof token.accessTokenExpires === "number" ? token.accessTokenExpires : undefined,
    providerAccountId: typeof token.sub === "string" ? token.sub : undefined,
    scope: typeof token.scope === "string" ? token.scope : undefined,
    tokenType: typeof token.tokenType === "string" ? token.tokenType : undefined,
    updatedAt: new Date().toISOString()
  });
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const provider = normalizeProvider(typeof token.provider === "string" ? token.provider : undefined);

  if (!token.refreshToken || !provider) {
    return {
      ...token,
      error: "MissingRefreshToken"
    };
  }

  try {
    const refreshed = await refreshProviderAccessToken({
      provider,
      refreshToken: token.refreshToken
    });

    const nextToken = {
      ...token,
      accessToken: refreshed.accessToken,
      accessTokenExpires: refreshed.accessTokenExpires,
      refreshToken: refreshed.refreshToken,
      error: undefined
    };

    await persistConnectionFromToken(nextToken);
    return nextToken;
  } catch {
    return {
      ...token,
      error: "RefreshAccessTokenError"
    };
  }
}

export const authConfig: NextAuthConfig = {
  providers,
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider) {
        token.provider = account.provider;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
        token.scope = account.scope;
        token.tokenType = account.token_type;
        token.email = user.email ?? token.email;
        await persistConnectionFromToken(token);
      }

      if (typeof token.accessTokenExpires === "number" && Date.now() > token.accessTokenExpires - 60_000) {
        return refreshAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.provider = typeof token.provider === "string" ? token.provider : undefined;
      }
      session.authError = typeof token.error === "string" ? token.error : undefined;
      return session;
    }
  },
  pages: {
    signIn: "/"
  }
};
