import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Symmetric encryption for reversible secrets (per-firm SMTP app-passwords).
// Unlike login passwords (bcrypt, one-way), we must recover the plaintext to
// authenticate to the mail server — so it is AES-256-GCM encrypted at rest.
//
// EMAIL_ENC_KEY must be a 32-byte key, provided as 64 hex chars or base64.
// The key is resolved lazily so the app can boot without it; it is only
// required the moment a firm secret is actually encrypted or decrypted.

const ALGO = "aes-256-gcm";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.EMAIL_ENC_KEY;
  if (!raw) {
    throw new Error(
      "EMAIL_ENC_KEY must be set to store or read per-firm email credentials (32-byte hex or base64)."
    );
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("EMAIL_ENC_KEY must decode to exactly 32 bytes (256 bits).");
  }
  cachedKey = key;
  return key;
}

/** Encrypt plaintext → "iv:authTag:ciphertext" (each base64). */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Decrypt a value produced by encryptSecret. Throws if tampered or malformed. */
export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret.");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
