import { Message, MessageAttachment, ProviderType, Thread, UserAccount } from "@/lib/types";

interface SyncedInbox {
  account: UserAccount;
  threads: Thread[];
  messages: Message[];
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailBody {
  data?: string;
  size?: number;
  attachmentId?: string;
}

interface GmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
}

interface GmailThread {
  id: string;
  messages?: GmailMessage[];
}

interface GmailAttachmentPayload {
  data?: string;
  size?: number;
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
  ccRecipients?: GraphRecipient[];
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

function headerValue(headers: GmailHeader[] | undefined, name: string): string | undefined {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value;
}

function gmailHeader(message: GmailMessage, name: string): string | undefined {
  return headerValue(message.payload?.headers, name);
}

function decodeBase64Url(data: string): Buffer {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function extractContentId(part: GmailPart): string | undefined {
  const raw = headerValue(part.headers, "Content-ID");
  if (!raw) return undefined;
  return raw.replace(/^<|>$/g, "").trim();
}

function isInlinePart(part: GmailPart): boolean {
  const disposition = headerValue(part.headers, "Content-Disposition") ?? "";
  return disposition.toLowerCase().startsWith("inline");
}

interface ExtractedBody {
  html?: string;
  text?: string;
  inlineParts: GmailPart[];
  attachments: MessageAttachment[];
}

function walkParts(part: GmailPart | undefined, out: ExtractedBody): void {
  if (!part) return;

  const mime = (part.mimeType ?? "").toLowerCase();

  if (mime.startsWith("multipart/")) {
    for (const child of part.parts ?? []) walkParts(child, out);
    return;
  }

  if (mime === "text/html" && part.body?.data && !out.html) {
    out.html = decodeBase64Url(part.body.data).toString("utf8");
    return;
  }

  if (mime === "text/plain" && part.body?.data && !out.text) {
    out.text = decodeBase64Url(part.body.data).toString("utf8");
    return;
  }

  if (mime.startsWith("image/") && (isInlinePart(part) || extractContentId(part))) {
    out.inlineParts.push(part);
    return;
  }

  if (part.filename && part.body?.attachmentId) {
    out.attachments.push({
      filename: part.filename,
      mimeType: part.mimeType ?? "application/octet-stream",
      size: part.body.size ?? 0,
    });
  }
}

async function fetchInlineDataUri(
  accessToken: string,
  messageId: string,
  part: GmailPart
): Promise<string | undefined> {
  const attachmentId = part.body?.attachmentId;
  if (!attachmentId) {
    if (part.body?.data) {
      return `data:${part.mimeType ?? "application/octet-stream"};base64,${decodeBase64Url(part.body.data).toString("base64")}`;
    }
    return undefined;
  }

  const payload = await getJson<GmailAttachmentPayload>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    accessToken
  );
  if (!payload.data) return undefined;
  const base64 = decodeBase64Url(payload.data).toString("base64");
  return `data:${part.mimeType ?? "application/octet-stream"};base64,${base64}`;
}

async function resolveBody(
  accessToken: string,
  messageId: string,
  gmailMessage: GmailMessage
): Promise<{ html?: string; text?: string; attachments: MessageAttachment[] }> {
  const extracted: ExtractedBody = { inlineParts: [], attachments: [] };
  walkParts(gmailMessage.payload, extracted);

  let html = extracted.html;

  if (html && extracted.inlineParts.length > 0) {
    const replacements = await Promise.all(
      extracted.inlineParts.map(async (part) => {
        const cid = extractContentId(part);
        if (!cid) return null;
        const dataUri = await fetchInlineDataUri(accessToken, messageId, part);
        if (!dataUri) return null;
        return { cid, dataUri };
      })
    );

    for (const replacement of replacements) {
      if (!replacement) continue;
      const escaped = replacement.cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`cid:${escaped}`, "gi");
      html = html.replace(pattern, replacement.dataUri);
    }
  }

  return { html, text: extracted.text, attachments: extracted.attachments };
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
        .filter((address) => Boolean(address) && address.toLowerCase() !== email.toLowerCase())
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

  return latest.isUnread ? "needs_reply" : "done";
}

function gmailThreadsUrl(label: MailboxLabel | undefined): string {
  const base = "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=25";
  switch (label) {
    case "sent":
      return `${base}&labelIds=SENT`;
    case "drafts":
      return `${base}&labelIds=DRAFT`;
    case "trash":
      return `${base}&labelIds=TRASH`;
    case "archive": {
      const q = encodeURIComponent("-in:inbox -in:sent -in:drafts -in:trash -in:spam");
      return `${base}&q=${q}`;
    }
    case "inbox":
    default:
      return `${base}&labelIds=INBOX`;
  }
}

async function syncGmail(
  accessToken: string,
  fallbackEmail?: string,
  label?: MailboxLabel
): Promise<SyncedInbox> {
  const profile = await getJson<{ emailAddress?: string }>(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    accessToken
  );
  const email = profile.emailAddress ?? fallbackEmail ?? "unknown@gmail.com";

  const threadList = await getJson<{ threads?: Array<{ id: string }> }>(
    gmailThreadsUrl(label),
    accessToken
  );

  const threadIds = Array.from(new Set((threadList.threads ?? []).map((t) => t.id)));

  const gmailThreads = await Promise.all(
    threadIds.map((threadId) =>
      getJson<GmailThread>(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
        accessToken
      )
    )
  );

  const messages: Message[] = [];
  const threads: Thread[] = [];

  for (const gmailThread of gmailThreads) {
    const threadMessages = await Promise.all(
      (gmailThread.messages ?? []).map(async (gmailMessage): Promise<Message> => {
        const subject = gmailHeader(gmailMessage, "Subject") ?? "(no subject)";
        const from = normalizeEmail(gmailHeader(gmailMessage, "From"));
        const to = (gmailHeader(gmailMessage, "To") ?? "")
          .split(",")
          .map((value) => normalizeEmail(value))
          .filter(Boolean);
        const cc = (gmailHeader(gmailMessage, "Cc") ?? "")
          .split(",")
          .map((value) => normalizeEmail(value))
          .filter(Boolean);
        const receivedAt = gmailMessage.internalDate
          ? new Date(Number(gmailMessage.internalDate)).toISOString()
          : new Date().toISOString();

        const body = await resolveBody(accessToken, gmailMessage.id, gmailMessage);

        return {
          id: gmailMessage.id,
          threadId: gmailThread.id,
          subject,
          from,
          to,
          cc: cc.length ? cc : undefined,
          snippet: gmailMessage.snippet ?? "",
          bodyPreview: gmailMessage.snippet ?? "",
          bodyHtml: body.html,
          bodyText: body.text,
          attachments: body.attachments.length ? body.attachments : undefined,
          receivedAt,
          isUnread: (gmailMessage.labelIds ?? []).includes("UNREAD"),
          labels: (gmailMessage.labelIds ?? []).map((label) => label.toLowerCase())
        };
      })
    );

    for (const message of threadMessages) {
      messages.push(message);
    }

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
      "&$select=id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,isRead,categories",
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
      cc: (() => {
        const list = (graphMessage.ccRecipients ?? [])
          .map((recipient) => recipient.emailAddress?.address ?? "")
          .filter(Boolean);
        return list.length ? list : undefined;
      })(),
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

export type MailboxLabel = "inbox" | "sent" | "drafts" | "archive" | "trash";

export async function syncProviderInbox(
  provider: ProviderType,
  email: string | undefined,
  accessToken: string,
  label?: MailboxLabel
): Promise<SyncedInbox> {
  if (!accessToken) {
    throw new Error("Missing OAuth access token");
  }

  if (provider === "google") {
    return syncGmail(accessToken, email, label);
  }

  return syncMicrosoft(accessToken, email);
}
