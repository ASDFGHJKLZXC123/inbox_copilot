import { EventEmitter } from "node:events";

export type InboxEvent = { type: "sync"; provider: string; email?: string };

class InboxEmitter extends EventEmitter {}

const inboxEmitter = new InboxEmitter();
inboxEmitter.setMaxListeners(100); // allow many SSE clients

export default inboxEmitter;
