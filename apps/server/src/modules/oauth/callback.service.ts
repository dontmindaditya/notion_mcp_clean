import { getEnv } from "../../config/environment";
import { decryptAES256GCM } from "../../utils/crypto";
import { OAuthStateError, TokenExchangeError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { query, withTransaction } from "../../database/client";
import { discoverOAuthMetadata } from "./discovery.service";
import { storeTokens } from "../token/token.service";
import type { CallbackValidation, TokenResponse } from "./oauth.types";

// ─── State Validation ───────────────────────────────────────────────

/**
 * Validate the callback state parameter:
 * - Exists in DB
 * - Not expired
 * - Not consumed (replay protection)
 * - Belongs to the correct session user
 * - Retrieve and decrypt the PKCE verifier
 */
export async function validateCallbackState(
  receivedState: string,
  sessionUserId: string
): Promise<CallbackValidation> {
  const env = getEnv();

  const result = await query(
    `SELECT id, state_value, user_id, encrypted_pkce_verifier, pkce_verifier_iv,
            expires_at, consumed
     FROM oauth_states
     WHERE state_value = $1`,
    [receivedState]
  );

  if (!result.rows.length) {
    throw new OAuthStateError("Unknown state parameter");
  }

  const stateRecord = result.rows[0];

  if (stateRecord.consumed) {
    throw new OAuthStateError("State already consumed — possible replay attack");
  }

  if (new Date(stateRecord.expires_at) < new Date()) {
    // Clean up expired state
    await query("DELETE FROM oauth_states WHERE id = $1", [stateRecord.id]);
    throw new OAuthStateError("State expired");
  }

  if (stateRecord.user_id !== sessionUserId) {
    throw new OAuthStateError("State does not belong to this session");
  }

  // Mark as consumed immediately (one-time use)
  await query(
    "UPDATE oauth_states SET consumed = TRUE WHERE id = $1",
    [stateRecord.id]
  );

  // Decrypt PKCE verifier
  const verifier = decryptAES256GCM(
    stateRecord.encrypted_pkce_verifier,
    stateRecord.pkce_verifier_iv,
    env.TOKEN_ENCRYPTION_KEY
  );

  logger.info("Callback state validated", { stateId: stateRecord.id, userId: sessionUserId });

  return {
    valid: true,
    verifier,
    userId: stateRecord.user_id,
  };
}

// ─── Code Exchange ──────────────────────────────────────────────────

/**
 * Exchange the authorization code for tokens using the token endpoint.
 * Includes the PKCE verifier for proof of possession.
 */
export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<TokenResponse> {
  const env = getEnv();
  const metadata = await discoverOAuthMetadata();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.NOTION_REDIRECT_URI,
    client_id: env.NOTION_CLIENT_ID,
    code_verifier: verifier,
  });

  // Confidential client includes client_secret
  if (env.NOTION_CLIENT_SECRET) {
    body.set("client_secret", env.NOTION_CLIENT_SECRET);
  }

  logger.info("Exchanging authorization code for tokens", {
    tokenEndpoint: metadata.token_endpoint,
  });

  let response: Response;
  try {
    response = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new TokenExchangeError(
      `Network error during token exchange: ${(err as Error).message}`
    );
  }

  if (!response.ok) {
    let errorBody: { error?: string; error_description?: string } = {};
    try {
      errorBody = await response.json() as { error?: string; error_description?: string };
    } catch {
      // ignore parse error
    }
    throw new TokenExchangeError(
      `Token exchange failed (${response.status}): ${errorBody.error_description || errorBody.error || "Unknown error"}`
    );
  }

  const tokenData = await response.json() as TokenResponse;

  logger.info("Token exchange successful", {
    expiresIn: tokenData.expires_in,
    scope: tokenData.scope,
    workspaceId: tokenData.workspace_id,
  });

  return tokenData;
}

// ─── Full Callback Handler ──────────────────────────────────────────

/**
 * Complete callback processing:
 * 1. Validate state
 * 2. Exchange code
 * 3. Encrypt & store tokens
 * 4. Clean up state record
 */
export async function handleCallback(
  code: string,
  state: string,
  sessionUserId: string
): Promise<{ success: boolean; workspace_name?: string }> {
  // 1. Validate state + retrieve verifier
  const validation = await validateCallbackState(state, sessionUserId);

  // 2. Exchange code for tokens
  const tokenData = await exchangeCodeForTokens(code, validation.verifier);

  // 3. Store encrypted tokens
  await storeTokens(validation.userId, tokenData);

  // 4. Clean up the consumed state record
  await query(
    "DELETE FROM oauth_states WHERE user_id = $1 AND consumed = TRUE",
    [validation.userId]
  );

  logger.info("OAuth callback completed successfully", {
    userId: validation.userId,
    workspaceName: tokenData.workspace_name,
  });

  return {
    success: true,
    workspace_name: tokenData.workspace_name,
  };
}