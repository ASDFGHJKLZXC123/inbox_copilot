import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

import { decryptToken, encryptToken, isEncrypted, resetKeyCacheForTests } from "@/lib/crypto";

const PREFIX = "enc:v1:";

function setKey(): string {
  const key = randomBytes(32).toString("base64");
  process.env.ENCRYPTION_KEY = key;
  resetKeyCacheForTests();
  return key;
}

beforeEach(() => {
  delete process.env.ENCRYPTION_KEY;
  resetKeyCacheForTests();
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
  resetKeyCacheForTests();
});

describe("encryptToken / decryptToken", () => {
  it("round-trips a token with a configured key", () => {
    setKey();
    const plaintext = "ya29.A0ARrdaM-fake-google-token-value";
    const ciphertext = encryptToken(plaintext);

    expect(ciphertext.startsWith(PREFIX)).toBe(true);
    expect(ciphertext).not.toContain(plaintext);
    expect(decryptToken(ciphertext)).toBe(plaintext);
  });

  it("uses a fresh IV so identical inputs produce different ciphertexts", () => {
    setKey();
    const plaintext = "same-token-value";
    const a = encryptToken(plaintext);
    const b = encryptToken(plaintext);

    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(plaintext);
    expect(decryptToken(b)).toBe(plaintext);
  });

  it("does not re-encrypt an already-encrypted value", () => {
    setKey();
    const ciphertext = encryptToken("hello");
    expect(encryptToken(ciphertext)).toBe(ciphertext);
  });

  it("passes plaintext through when ENCRYPTION_KEY is unset (legacy mode)", () => {
    const plaintext = "legacy-plaintext-token";
    const out = encryptToken(plaintext);
    expect(out).toBe(plaintext);
    expect(decryptToken(plaintext)).toBe(plaintext);
  });

  it("throws when reading an encrypted value without a key", () => {
    setKey();
    const ciphertext = encryptToken("secret");
    delete process.env.ENCRYPTION_KEY;
    resetKeyCacheForTests();

    expect(() => decryptToken(ciphertext)).toThrow(/ENCRYPTION_KEY is not set/);
  });

  it("throws when the ciphertext has been tampered with (auth tag fails)", () => {
    setKey();
    const ciphertext = encryptToken("integrity-protected");
    const tampered =
      PREFIX +
      Buffer.from(
        ciphertext.slice(PREFIX.length).replace(/[A-Za-z]/, (c) => (c === "A" ? "B" : "A"))
      ).toString();

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects an ENCRYPTION_KEY that is not 32 bytes", () => {
    process.env.ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    resetKeyCacheForTests();

    expect(() => encryptToken("anything")).toThrow(/32 bytes/);
  });
});

describe("isEncrypted", () => {
  it("recognizes the enc:v1: prefix", () => {
    setKey();
    expect(isEncrypted(encryptToken("x"))).toBe(true);
    expect(isEncrypted("ya29.plain-token")).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });
});
