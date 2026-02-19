import { getEnv } from "../../config/environment";
import { encryptAES256GCM, decryptAES256GCM } from "../../utils/crypto";

export interface EncryptedToken {
  ciphertext: Buffer;
  iv: Buffer;
}

/** Encrypt a token string using AES-256-GCM with the app encryption key */
export function encryptToken(plaintext: string): EncryptedToken {
  const env = getEnv();
  const result = encryptAES256GCM(plaintext, env.TOKEN_ENCRYPTION_KEY);
  return {
    ciphertext: result.ciphertext,
    iv: result.iv,
  };
}

/** Decrypt a stored token using AES-256-GCM */
export function decryptToken(ciphertext: Buffer, iv: Buffer): string {
  const env = getEnv();
  return decryptAES256GCM(ciphertext, iv, env.TOKEN_ENCRYPTION_KEY);
}