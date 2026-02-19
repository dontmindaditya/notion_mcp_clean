import { getEnv } from "../../config/environment";
import { OAUTH_STATE_EXPIRY_MS } from "../../config/constants";
import { randomBase64Url, randomUUID, encryptAES256GCM } from "../../utils/crypto";
import { logger } from "../../utils/logger";
import { query } from "../../database/client";
import { discoverOAuthMetadata } from "./discovery.service";
import { generatePKCE } from "./pkce.service";

/**
 * Build the full Notion authorization URL, store state + encrypted PKCE
 * verifier in the database, and return the redirect URL.
 */
export async function buildAuthorizationUrl(userId: string): Promise<string> {
  const env = getEnv();

  // 1. Discover endpoints (may hit cache)
  const metadata = await discoverOAuthMetadata();

  // 2. Generate PKCE pair
  const pkce = generatePKCE();

  // 3. Generate cryptographic state
  const state = randomBase64Url(32); // 43 chars

  // 4. Encrypt the PKCE verifier before storing in DB
  const encrypted = encryptAES256GCM(pkce.verifier, env.TOKEN_ENCRYPTION_KEY);

  // 5. Persist state for validation on callback
  const stateId = randomUUID();
  const expiresAt = new Date(Date.now() + OAUTH_STATE_EXPIRY_MS);

  await query(
    `INSERT INTO oauth_states
       (id, state_value, user_id, encrypted_pkce_verifier, pkce_verifier_iv, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      stateId,
      state,
      userId,
      encrypted.ciphertext,
      encrypted.iv,
      expiresAt,
    ]
  );

  logger.info("OAuth state stored", { stateId, userId, expiresAt: expiresAt.toISOString() });

  // 6. Build authorization URL
  const params = new URLSearchParams({
    client_id: env.NOTION_CLIENT_ID,
    redirect_uri: env.NOTION_REDIRECT_URI,
    response_type: "code",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    state,
  });

  const authUrl = `${metadata.authorization_endpoint}?${params.toString()}`;

  logger.info("Authorization URL built", { authorizationEndpoint: metadata.authorization_endpoint });

  return authUrl;
}