import { generatePKCEVerifier, computePKCEChallenge } from "../../utils/crypto";
import type { PKCEPair } from "./oauth.types";

/**
 * Generate a PKCE pair: cryptographic verifier + S256 challenge.
 *
 * The verifier is 43 base64url characters (from 32 random bytes).
 * The challenge is BASE64URL(SHA-256(verifier)).
 */
export function generatePKCE(): PKCEPair {
  const verifier = generatePKCEVerifier();
  const challenge = computePKCEChallenge(verifier);

  return {
    verifier,
    challenge,
    method: "S256",
  };
}