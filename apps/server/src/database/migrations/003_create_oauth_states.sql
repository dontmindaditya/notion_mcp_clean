-- Migration: 003_create_oauth_states
-- Description: Create the oauth_states table for CSRF and PKCE state tracking

CREATE TABLE IF NOT EXISTS oauth_states (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    state_value                 VARCHAR(64)     UNIQUE NOT NULL,
    user_id                     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_pkce_verifier     BYTEA           NOT NULL,
    pkce_verifier_iv            BYTEA           NOT NULL,
    created_at                  TIMESTAMP       NOT NULL DEFAULT NOW(),
    expires_at                  TIMESTAMP       NOT NULL,
    consumed                    BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_os_state   ON oauth_states (state_value);
CREATE INDEX IF NOT EXISTS idx_os_expires ON oauth_states (expires_at);