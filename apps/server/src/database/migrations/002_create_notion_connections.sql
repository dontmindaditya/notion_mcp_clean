-- Migration: 002_create_notion_connections
-- Description: Create the notion_connections table for encrypted token storage

CREATE TABLE IF NOT EXISTS notion_connections (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID            UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_access_token      BYTEA,
    access_token_iv             BYTEA,
    encrypted_refresh_token     BYTEA,
    refresh_token_iv            BYTEA,
    expires_at                  TIMESTAMP       NOT NULL,
    scope                       TEXT,
    workspace_id                VARCHAR(255),
    workspace_name              VARCHAR(255),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'active',
    refresh_count               INTEGER         NOT NULL DEFAULT 0,
    last_used_at                TIMESTAMP,
    refreshed_at                TIMESTAMP,
    disconnected_at             TIMESTAMP,
    created_at                  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nc_user_id  ON notion_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_nc_status   ON notion_connections (status);
CREATE INDEX IF NOT EXISTS idx_nc_expires  ON notion_connections (expires_at);