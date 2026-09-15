import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Derives the 32-byte AES key from SECRETS_ENCRYPTION_KEY (base64, generated
 * with `openssl rand -base64 32`). Read lazily so importing this module
 * never throws in contexts (e.g. type-checking) where the env var is unset.
 */
function getKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and set it in your environment before encrypting or decrypting secrets.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SECRETS_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).");
  }
  return key;
}

/**
 * Envelope-encrypts a plaintext secret (e.g. a model provider API key).
 * Layout: [12-byte IV][16-byte auth tag][ciphertext], suitable for a
 * Postgres `bytea` column.
 */
export function encryptSecret(plaintext: string): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptSecret(encrypted: Buffer): string {
  const key = getKey();
  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = encrypted.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
