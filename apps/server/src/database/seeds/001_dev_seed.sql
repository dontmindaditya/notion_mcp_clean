-- Seed: Development Data
-- Run with: psql $DATABASE_URL -f seeds/001_dev_seed.sql
-- Purpose: Bootstrap local dev environment with a test user
--
-- NOTE: This seed is for development/testing ONLY.
--       Never run in production.

-- ─── Dev User ───────────────────────────────────────────────────────
-- This matches the auto-login user created by the dev middleware
-- in index.ts (email: dev@localhost)

INSERT INTO users (id, email, name, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'dev@localhost',
  'Dev User',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ─── Optional: Second test user for multi-user testing ──────────────

INSERT INTO users (id, email, name, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'test@localhost',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ─── Disconnected connection placeholder ────────────────────────────
-- This lets you test the "not_connected" → "connect" UI flow
-- without needing a real Notion OAuth round-trip first.
--
-- No real tokens are stored (NULLs). Status is 'disconnected'
-- so the frontend sees the "Connect Notion" prompt.

INSERT INTO notion_connections (
  id,
  user_id,
  encrypted_access_token,
  access_token_iv,
  encrypted_refresh_token,
  refresh_token_iv,
  expires_at,
  scope,
  workspace_id,
  workspace_name,
  status,
  refresh_count,
  created_at,
  updated_at
)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  NULL,
  NULL,
  NULL,
  NOW() - INTERVAL '1 hour',  -- already expired
  NULL,
  NULL,
  NULL,
  'disconnected',
  0,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;