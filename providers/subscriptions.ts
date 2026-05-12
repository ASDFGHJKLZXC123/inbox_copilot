import { randomBytes } from "node:crypto";

import { ProviderSubscription, ProviderType } from "@/lib/types";

function notificationUrlFor(provider: ProviderType): string {
  if (provider === "google") {
    return process.env.GOOGLE_PUSH_ENDPOINT ?? "http://localhost:3000/api/webhooks/google";
  }

  return process.env.MICROSOFT_WEBHOOK_URL ?? "http://localhost:3000/api/webhooks/microsoft";
}

function createId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export async function createProviderSubscription(input: {
  provider: ProviderType;
  email: string;
  accessToken: string;
}): Promise<ProviderSubscription> {
  if (input.provider === "google") {
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC;

    if (!topicName) {
      throw new Error("GOOGLE_PUBSUB_TOPIC is required to create a Gmail watch subscription");
    }

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        labelIds: ["INBOX", "SENT"],
        topicName
      })
    });

    const payload = (await response.json()) as {
      historyId?: string;
      expiration?: string;
      error?: {
        message?: string;
      };
    };

    if (!response.ok || !payload.historyId) {
      throw new Error(payload.error?.message || "Failed to create Gmail watch");
    }

    const now = new Date().toISOString();

    return {
      id: `google:${input.email.toLowerCase()}`,
      provider: "google",
      email: input.email,
      externalId: payload.historyId,
      notificationUrl: notificationUrlFor("google"),
      status: "active",
      expiresAt: payload.expiration ? new Date(Number(payload.expiration)).toISOString() : undefined,
      createdAt: now,
      updatedAt: now
    };
  }

  const notificationUrl = notificationUrlFor("microsoft");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString();
  const clientState = createId("client");

  const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      changeType: "created,updated",
      notificationUrl,
      resource: "/me/mailFolders('Inbox')/messages",
      expirationDateTime: expiresAt,
      clientState
    })
  });

  const payload = (await response.json()) as {
    id?: string;
    resource?: string;
    expirationDateTime?: string;
    error?: {
      message?: string;
    };
  };

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message || "Failed to create Microsoft Graph subscription");
  }

  const now = new Date().toISOString();

  return {
    id: `microsoft:${input.email.toLowerCase()}`,
    provider: "microsoft",
    email: input.email,
    externalId: payload.id,
    resourceId: payload.resource,
    notificationUrl,
    clientState,
    status: "active",
    expiresAt: payload.expirationDateTime ?? expiresAt,
    createdAt: now,
    updatedAt: now
  };
}
