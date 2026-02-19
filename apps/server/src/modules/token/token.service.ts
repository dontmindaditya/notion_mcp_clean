import { getEnv } from "../../config/environment";
import {
  TOKEN_REFRESH_BUFFER_MS,
  TOKEN_REFRESH_LOCK_TTL_SECONDS,
  TOKEN_REFRESH_WAIT_TIMEOUT_MS,
  TOKEN_REFRESH_WAIT_POLL_MS,
  TOKEN_REFRESH_MAX_RETRIES,
  NETWORK_RETRY_BASE_DELAY_MS,
} from "../../config/constants";
import {
  NoConnectionError,
  ReconnectionRequired,
  TokenRefreshError,
  ConcurrentRefreshTimeout,
} from "../../utils/errors";
import { logger } from "../../utils/logger";
import { encryptToken, decryptToken } from "./token.encryption";
import {
  findConnectionByUserId,
  upsertConnection,
  updateTokensAfterRefresh,
  disconnectUser,
  touchLastUsed,
} from "./token.repository";
import { discoverOAuthMetadata } from "../oauth/discovery.service";
import { getRedis } from "../../middleware/session.middleware";
import type { TokenResponse } from "../oauth/oauth.types";
import type { ConnectionStatus } from "./token.types";

// ─── Store Tokens ───────────────────────────────────────────────────

/**
 * Encrypt and store tokens from a fresh token exchange.
 * 
 * Notion tokens do NOT have an expires_in field - they don't expire.
 * We set a far-future expiry date (1 year) to handle this gracefully.
 */
export async function storeTokens(
  userId: string,
  tokenData: TokenResponse
): Promise<void> {
  const encryptedAccess = encryptToken(tokenData.access_token);

  const encryptedRefresh = tokenData.refresh_token
    ? encryptToken(tokenData.refresh_token)
    : null;

  // Notion tokens don't expire - set far-future date if expires_in is missing
  // Default to 1 year from now if no expiry provided
  const expiresInSeconds = tokenData.expires_in ?? (365 * 24 * 60 * 60); // 1 year
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await upsertConnection({
    userId,
    encryptedAccessToken: encryptedAccess,
    encryptedRefreshToken: encryptedRefresh,
    expiresAt,
    scope: tokenData.scope ?? null,
    workspaceId: tokenData.workspace_id ?? null,
    workspaceName: tokenData.workspace_name ?? null,
  });

  // Invalidate any cached token
  const redis = getRedis();
  await redis.del(`access_token:${userId}`);

  logger.info("Tokens stored securely", { 
    userId, 
    expiresAt: expiresAt.toISOString(),
    hasRefreshToken: !!encryptedRefresh,
    workspaceName: tokenData.workspace_name,
  });
}

// ─── Get Valid Access Token ─────────────────────────────────────────

/**
 * Retrieve a valid access token for the user.
 * Proactively refreshes if the token expires within the buffer window.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const redis = getRedis();

  // Check cache first
  const cached = await redis.get(`access_token:${userId}`);
  if (cached) {
    logger.debug("Using cached access token", { userId });
    return cached;
  }

  const connection = await findConnectionByUserId(userId);

  if (!connection) {
    throw new NoConnectionError();
  }

  if (connection.status === "disconnected") {
    throw new ReconnectionRequired();
  }

  if (!connection.encrypted_access_token || !connection.access_token_iv) {
    throw new ReconnectionRequired("Token data missing. Please reconnect.");
  }

  const now = Date.now();
  const expiresAt = new Date(connection.expires_at).getTime();

  // Token is still valid (with buffer)
  if (expiresAt > now + TOKEN_REFRESH_BUFFER_MS) {
    const accessToken = decryptToken(
      connection.encrypted_access_token,
      connection.access_token_iv
    );

    // ── Diagnostic: Log decrypted token info ───
    const tokenPreview = accessToken.length > 20
      ? `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}`
      : `[token too short: ${accessToken.length} chars]`;
    logger.debug("Decrypted access token for MCP", { 
      userId, 
      tokenPreview,
      tokenLength: accessToken.length 
    });

    // Cache the decrypted token with a safe TTL
    const cacheTTLSeconds = Math.max(
      1,
      Math.floor((expiresAt - now - 60_000) / 1000)
    );
    await redis.setex(`access_token:${userId}`, cacheTTLSeconds, accessToken);

    // Update last used
    touchLastUsed(userId).catch(() => {}); // fire-and-forget

    return accessToken;
  }

  // Token expired or expiring soon → refresh
  logger.info("Token expired or expiring soon, refreshing", { userId });
  return refreshAccessToken(userId);
}

// ─── Refresh Access Token ───────────────────────────────────────────

/**
 * Refresh the access token using the stored refresh token.
 * Uses a Redis distributed lock to prevent concurrent refresh races.
 */
export async function refreshAccessToken(userId: string): Promise<string> {
  const redis = getRedis();
  const lockKey = `token_refresh:${userId}`;

  // Attempt to acquire distributed lock
  const lockValue = `${Date.now()}-${Math.random()}`;
  const lockAcquired = await redis.set(
    lockKey,
    lockValue,
    "EX",
    TOKEN_REFRESH_LOCK_TTL_SECONDS,
    "NX"
  );

  if (!lockAcquired) {
    // Another process is refreshing — wait and check
    logger.info("Token refresh lock held by another process, waiting", { userId });
    return waitForRefresh(userId);
  }

  try {
    const connection = await findConnectionByUserId(userId);

    if (!connection) {
      throw new NoConnectionError();
    }

    if (
      !connection.encrypted_refresh_token ||
      !connection.refresh_token_iv
    ) {
      // No refresh token — user must re-authenticate
      await disconnectUser(userId);
      throw new ReconnectionRequired("No refresh token available. Please reconnect.");
    }

    const decryptedRefreshToken = decryptToken(
      connection.encrypted_refresh_token,
      connection.refresh_token_iv
    );

    const env = getEnv();
    const metadata = await discoverOAuthMetadata();

    // Build request body - NOT including client credentials in body
    // Notion uses HTTP Basic Auth for client authentication
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptedRefreshToken,
    });

    // Create Basic Auth header: base64(client_id:client_secret)
    const credentials = Buffer.from(
      `${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`
    ).toString("base64");

    // Retry with exponential backoff on network errors
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < TOKEN_REFRESH_MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(metadata.token_endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${credentials}`,
          },
          body: body.toString(),
          signal: AbortSignal.timeout(15_000),
        });

        if (response.ok) {
          const tokenData = await response.json() as TokenResponse;

          // Token rotation: store the new refresh token
          const encryptedAccess = encryptToken(tokenData.access_token);
          const encryptedRefresh = tokenData.refresh_token
            ? encryptToken(tokenData.refresh_token)
            : null;
          
          // Notion tokens don't expire - set far-future date if expires_in is missing
          const expiresInSeconds = tokenData.expires_in ?? (365 * 24 * 60 * 60); // 1 year
          const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

          await updateTokensAfterRefresh({
            userId,
            encryptedAccessToken: encryptedAccess,
            encryptedRefreshToken: encryptedRefresh,
            expiresAt,
          });

          // Invalidate old cached token
          await redis.del(`access_token:${userId}`);

          logger.info("Token refreshed successfully", {
            userId,
            expiresAt: expiresAt.toISOString(),
            refreshCount: connection.refresh_count + 1,
          });

          return tokenData.access_token;
        }

        // Handle specific error responses
        if (response.status === 400) {
          let errorBody: { error?: string } = {};
          try {
            errorBody = await response.json() as { error?: string };
          } catch {
            // ignore
          }

          if (errorBody.error === "invalid_grant") {
            // Refresh token revoked or rotated away
            logger.warn("Refresh token invalid_grant — disconnecting user", { userId });
            await disconnectUser(userId);
            await redis.del(`access_token:${userId}`);
            throw new ReconnectionRequired();
          }
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
          logger.warn("Token refresh rate limited", { userId, retryAfter });
          await sleep(retryAfter * 1000);
          continue;
        }

        // Other errors
        throw new TokenRefreshError(
          `Token refresh failed with status ${response.status}`
        );
      } catch (err) {
        if (err instanceof ReconnectionRequired || err instanceof TokenRefreshError) {
          throw err;
        }
        lastError = err as Error;
        logger.warn("Token refresh network error, retrying", {
          userId,
          attempt: attempt + 1,
          error: (err as Error).message,
        });
        await sleep(NETWORK_RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw new TokenRefreshError(
      `Token refresh failed after ${TOKEN_REFRESH_MAX_RETRIES} retries: ${lastError?.message}`
    );
  } finally {
    // Release lock only if we still own it
    const currentValue = await redis.get(lockKey);
    if (currentValue === lockValue) {
      await redis.del(lockKey);
    }
  }
}

// ─── Wait for Concurrent Refresh ────────────────────────────────────

async function waitForRefresh(userId: string): Promise<string> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < TOKEN_REFRESH_WAIT_TIMEOUT_MS) {
    await sleep(TOKEN_REFRESH_WAIT_POLL_MS);

    const connection = await findConnectionByUserId(userId);
    if (connection && new Date(connection.expires_at).getTime() > Date.now() + 60_000) {
      if (connection.encrypted_access_token && connection.access_token_iv) {
        return decryptToken(
          connection.encrypted_access_token,
          connection.access_token_iv
        );
      }
    }
  }

  throw new ConcurrentRefreshTimeout();
}

// ─── Connection Status ──────────────────────────────────────────────

export async function getConnectionStatus(userId: string): Promise<ConnectionStatus> {
  const connection = await findConnectionByUserId(userId);

  if (!connection || connection.status === "disconnected") {
    return {
      connected: false,
      workspace_name: null,
      workspace_id: null,
      connected_at: null,
      status: "disconnected",
    };
  }

  return {
    connected: true,
    workspace_name: connection.workspace_name,
    workspace_id: connection.workspace_id,
    connected_at: connection.created_at.toISOString(),
    status: connection.status,
  };
}

// ─── Disconnect ─────────────────────────────────────────────────────

export async function disconnect(userId: string): Promise<void> {
  const redis = getRedis();
  await disconnectUser(userId);
  await redis.del(`access_token:${userId}`);
  logger.info("User disconnected from Notion", { userId });
}

// ─── Utility ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}