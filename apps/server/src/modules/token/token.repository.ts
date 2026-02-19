import { query } from "../../database/client";
import { randomUUID } from "../../utils/crypto";
import type { StoredConnection } from "./token.types";
import type { EncryptedToken } from "./token.encryption";

/** Fetch the notion_connection for a given user */
export async function findConnectionByUserId(
  userId: string
): Promise<StoredConnection | null> {
  const result = await query<StoredConnection>(
    `SELECT * FROM notion_connections WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/** Create or replace a notion_connection with encrypted tokens */
export async function upsertConnection(params: {
  userId: string;
  encryptedAccessToken: EncryptedToken;
  encryptedRefreshToken: EncryptedToken | null;
  expiresAt: Date;
  scope: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
}): Promise<void> {
  const id = randomUUID();

  await query(
    `INSERT INTO notion_connections
       (id, user_id, encrypted_access_token, access_token_iv,
        encrypted_refresh_token, refresh_token_iv,
        expires_at, scope, workspace_id, workspace_name,
        status, refresh_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', 0, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       encrypted_access_token  = EXCLUDED.encrypted_access_token,
       access_token_iv         = EXCLUDED.access_token_iv,
       encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
       refresh_token_iv        = EXCLUDED.refresh_token_iv,
       expires_at              = EXCLUDED.expires_at,
       scope                   = EXCLUDED.scope,
       workspace_id            = EXCLUDED.workspace_id,
       workspace_name          = EXCLUDED.workspace_name,
       status                  = 'active',
       refresh_count           = 0,
       disconnected_at         = NULL,
       updated_at              = NOW()`,
    [
      id,
      params.userId,
      params.encryptedAccessToken.ciphertext,
      params.encryptedAccessToken.iv,
      params.encryptedRefreshToken?.ciphertext ?? null,
      params.encryptedRefreshToken?.iv ?? null,
      params.expiresAt,
      params.scope,
      params.workspaceId,
      params.workspaceName,
    ]
  );
}

/** Update tokens after a successful refresh */
export async function updateTokensAfterRefresh(params: {
  userId: string;
  encryptedAccessToken: EncryptedToken;
  encryptedRefreshToken: EncryptedToken | null;
  expiresAt: Date;
}): Promise<void> {
  await query(
    `UPDATE notion_connections SET
       encrypted_access_token  = $2,
       access_token_iv         = $3,
       encrypted_refresh_token = $4,
       refresh_token_iv        = $5,
       expires_at              = $6,
       refreshed_at            = NOW(),
       refresh_count           = refresh_count + 1,
       updated_at              = NOW()
     WHERE user_id = $1`,
    [
      params.userId,
      params.encryptedAccessToken.ciphertext,
      params.encryptedAccessToken.iv,
      params.encryptedRefreshToken?.ciphertext ?? null,
      params.encryptedRefreshToken?.iv ?? null,
      params.expiresAt,
    ]
  );
}

/** Mark connection as disconnected and clear tokens */
export async function disconnectUser(userId: string): Promise<void> {
  await query(
    `UPDATE notion_connections SET
       status = 'disconnected',
       encrypted_access_token  = NULL,
       access_token_iv         = NULL,
       encrypted_refresh_token = NULL,
       refresh_token_iv        = NULL,
       disconnected_at         = NOW(),
       updated_at              = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

/** Update the last_used_at timestamp */
export async function touchLastUsed(userId: string): Promise<void> {
  await query(
    `UPDATE notion_connections SET last_used_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
    [userId]
  );
}

/** Delete the connection entirely */
export async function deleteConnection(userId: string): Promise<void> {
  await query("DELETE FROM notion_connections WHERE user_id = $1", [userId]);
}