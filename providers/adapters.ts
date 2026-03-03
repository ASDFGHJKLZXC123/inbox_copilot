import { Message, ProviderType, Thread, UserAccount } from "@/lib/types";

interface SyncedInbox {
  account: UserAccount;
  threads: Thread[];
  messages: Message[];
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessage {
  id: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
}

interface GmailThread {
  id: string;
  messages?: GmailMessage[];
}

interface GraphRecipient {
  emailAddress?: {
    address?: string;
    name?: string;
  };
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  receivedDateTime?: string;
  bodyPreview?: string;
  isRead?: boolean;
  categories?: string[];
}

function getJson<T>(url: string, accessToken: string): Promise<T> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  }).then(async (response) => {
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Provider sync failed (${response.status}): ${message}`);
    }

    return (await response.json()) as T;
  });
}

function gmailHeader(message: GmailMessage, name: string): string | undefined {
  const headers = message.payload?.headers ?? [];
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value;
}

function normalizeEmail(raw?: string): string {
  if (!raw) {
    return "";
  }

  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim();
}

function participantsFromMessages(messages: Message[], email: string): string[] {
  return Array.from(
    new Set(
      messages
        .flatMap((message) => [message.from, ...message.to])
        .filter(Boolean)
        .map((participant) => participant || email)
    )
  );
}

function threadStatus(messages: Message[], email: string): Thread["status"] {
  const latest = [...messages].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];

  if (!latest) {
    return "done";
  }

  if (normalizeEmail(latest.from).toLowerCase() === email.toLowerCase()) {
    return "waiting_on";
  }

  return latest.isUnread ? "needs_reply" : "needs_reply";
}

async function syncGmail(accessToken: string, fallbackEmail?: string): Promise<SyncedInbox> {
  const profile = await getJson<{ emailAddress?: string }>(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    accessToken
  );
  const email = profile.emailAddress ?? fallbackEmail ?? "unknown@gmail.com";

  const [inboxThreads, sentThreads] = await Promise.all([
    getJson<{ threads?: Array<{ id: string }> }>(
      "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=20&labelIds=INBOX",
      accessToken
    ),
    getJson<{ threads?: Array<{ id: string }> }>(
      "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=20&labelIds=SENT",
      accessToken
    )
  ]);

  const threadIds = Array.from(
    new Set([...(inboxThreads.threads ?? []), ...(sentThreads.threads ?? [])].map((thread) => thread.id))
  );

  const gmailThreads = await Promise.all(
    threadIds.map((threadId) =>
      getJson<GmailThread>(
        [
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
          "?format=metadata",
          "&metadataHeaders=Subject",
          "&metadataHeaders=From",
          "&metadataHeaders=To",
          "&metadataHeaders=Date"
        ].join(""),
        accessToken
      )
    )
  );

  const messages: Message[] = [];
  const threads: Thread[] = [];

  for (const gmailThread of gmailThreads) {
    const threadMessages = (gmailThread.messages ?? []).map((gmailMessage) => {
      const subject = gmailHeader(gmailMessage, "Subject") ?? "(no subject)";
      const from = normalizeEmail(gmailHeader(gmailMessage, "From"));
      const to = (gmailHeader(gmailMessage, "To") ?? "")
        .split(",")
        .map((value) => normalizeEmail(value))
        .filter(Boolean);
      const receivedAt = gmailMessage.internalDate
        ? new Date(Number(gmailMessage.internalDate)).toISOString()
        : new Date().toISOString();

      const message: Message = {
        id: gmailMessage.id,
        threadId: gmailThread.id,
        subject,
        from,
        to,
        snippet: gmailMessage.snippet ?? "",
        bodyPreview: gmailMessage.snippet ?? "",
        receivedAt,
        isUnread: (gmailMessage.labelIds ?? []).includes("UNREAD"),
        labels: (gmailMessage.labelIds ?? []).map((label) => label.toLowerCase())
      };

      messages.push(message);
      return message;
    });

    if (!threadMessages.length) {
      continue;
    }

    const latest = [...threadMessages].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
    const status = threadStatus(threadMessages, email);

    threads.push({
      id: gmailThread.id,
      subject: latest.subject,
      participants: participantsFromMessages(threadMessages, email),
      messageIds: threadMessages.map((message) => message.id),
      lastMessageAt: latest.receivedAt,
      status,
      waitingOn:
        status === "waiting_on"
          ? `A reply from ${participantsFromMessages(threadMessages, email).find((participant) => participant !== email) ?? "the recipient"}`
          : undefined
    });
  }

  return {
    account: {
      id: `google_${email}`,
      email,
      provider: "google",
      lastSyncedAt: new Date().toISOString()
    },
    threads,
    messages
  };
}

async function syncMicrosoft(accessToken: string, fallbackEmail?: string): Promise<SyncedInbox> {
  const profile = await getJson<{ mail?: string; userPrincipalName?: string; displayName?: string }>(
    "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName",
    accessToken
  );
  const email = profile.mail ?? profile.userPrincipalName ?? fallbackEmail ?? "unknown@outlook.com";

  const payload = await getJson<{ value?: GraphMessage[] }>(
    [
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
      "?$top=25",
      "&$select=id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,categories",
      "&$orderby=receivedDateTime DESC"
    ].join(""),
    accessToken
  );

  const grouped = new Map<string, Message[]>();

  for (const graphMessage of payload.value ?? []) {
    const threadId = graphMessage.conversationId ?? graphMessage.id;
    const message: Message = {
      id: graphMessage.id,
      threadId,
      subject: graphMessage.subject ?? "(no subject)",
      from: graphMessage.from?.emailAddress?.address ?? "",
      to: (graphMessage.toRecipients ?? [])
        .map((recipient) => recipient.emailAddress?.address ?? "")
        .filter(Boolean),
      snippet: graphMessage.bodyPreview ?? "",
      bodyPreview: graphMessage.bodyPreview ?? "",
      receivedAt: graphMessage.receivedDateTime ?? new Date().toISOString(),
      isUnread: !graphMessage.isRead,
      labels: graphMessage.categories ?? []
    };

    messagesPush(grouped, threadId, message);
  }

  const messages = Array.from(grouped.values()).flat();
  const threads: Thread[] = Array.from(grouped.entries()).map(([threadId, threadMessages]) => {
    const latest = [...threadMessages].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
    const status = threadStatus(threadMessages, email);

    return {
      id: threadId,
      subject: latest.subject,
      participants: participantsFromMessages(threadMessages, email),
      messageIds: threadMessages.map((message) => message.id),
      lastMessageAt: latest.receivedAt,
      status,
      waitingOn:
        status === "waiting_on"
          ? `A reply from ${participantsFromMessages(threadMessages, email).find((participant) => participant !== email) ?? "the recipient"}`
          : undefined
    };
  });

  return {
    account: {
      id: `microsoft_${email}`,
      email,
      name: profile.displayName,
      provider: "microsoft",
      lastSyncedAt: new Date().toISOString()
    },
    threads: threads.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    messages: messages.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  };
}

function messagesPush(grouped: Map<string, Message[]>, threadId: string, message: Message): void {
  const existing = grouped.get(threadId) ?? [];
  existing.push(message);
  grouped.set(threadId, existing);
}

export async function syncProviderInbox(
  provider: ProviderType,
  email: string | undefined,
  accessToken: string
): Promise<SyncedInbox> {
  if (!accessToken) {
    throw new Error("Missing OAuth access token");
  }

  if (provider === "google") {
    return syncGmail(accessToken, email);
  }

  return syncMicrosoft(accessToken, email);
}
