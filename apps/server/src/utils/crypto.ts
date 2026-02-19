import crypto from "node:crypto";

// ─── Random Generators ──────────────────────────────────────────────

/** Generate a cryptographically random base64url string */
export function randomBase64Url(byteLength: number): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

/** Generate a random UUID v4 */
export function randomUUID(): string {
  return crypto.randomUUID();
}

// ─── PKCE ───────────────────────────────────────────────────────────

/**
 * Generate a PKCE verifier (43-128 chars base64url).
 * 32 random bytes → 43 base64url characters.
 */
export function generatePKCEVerifier(): string {
  return randomBase64Url(32);
}

/**
 * Compute the S256 challenge from a verifier.
 * challenge = BASE64URL(SHA-256(verifier))
 */
export function computePKCEChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

// ─── AES-256-GCM Encryption ────────────────────────────────────────

export interface EncryptionResult {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Encrypt plaintext using AES-256-GCM with a random 12-byte IV.
 * The auth tag is appended to the ciphertext for storage.
 */
export function encryptAES256GCM(plaintext: string, keyBase64: string): EncryptionResult {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes");
  }

  const iv = crypto.randomBytes(12); // GCM standard: 12-byte IV
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store ciphertext + authTag together
  const ciphertext = Buffer.concat([encrypted, authTag]);

  return { ciphertext, iv, authTag };
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 * Expects ciphertext to have the 16-byte auth tag appended.
 */
export function decryptAES256GCM(
  ciphertextWithTag: Buffer,
  iv: Buffer,
  keyBase64: string
): string {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes");
  }

  // Last 16 bytes are the auth tag
  const authTagLength = 16;
  const encrypted = ciphertextWithTag.subarray(0, ciphertextWithTag.length - authTagLength);
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - authTagLength);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}