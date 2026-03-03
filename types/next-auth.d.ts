import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    authError?: string;
    user?: DefaultSession["user"] & {
      provider?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    error?: string;
    provider?: string;
    refreshToken?: string;
    scope?: string;
    tokenType?: string;
  }
}
