import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null | undefined;
let warnedMissingKey = false;

function loadKey(): Buffer | null {
  if (cachedKey !== undefined) {
    return cachedKey;
  }

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    cachedKey = null;
    return cachedKey;
  }

  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${buf.length}. Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
    );
  }

  cachedKey = buf;
  return cachedKey;
}

export function resetKeyCacheForTests(): void {
  cachedKey = undefined;
  warnedMissingKey = false;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptToken(plaintext: string): string {
  const key = loadKey();
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[crypto] ENCRYPTION_KEY not set — OAuth tokens will be stored in plaintext. See .env.example."
      );
    }
    return plaintext;
  }

  if (isEncrypted(plaintext)) {
    return plaintext;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

export function decryptToken(value: string): string {
  if (!isEncrypted(value)) {
    return value;
  }

  const key = loadKey();
  if (!key) {
    throw new Error(
      "Found encrypted token in store but ENCRYPTION_KEY is not set. Restore the key or wipe .data/inbox.json and reconnect."
    );
  }

  const blob = Buffer.from(value.slice(PREFIX.length), "base64");
  if (blob.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error("Encrypted token payload is malformed");
  }

  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(blob.length - TAG_BYTES);
  const ciphertext = blob.subarray(IV_BYTES, blob.length - TAG_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
