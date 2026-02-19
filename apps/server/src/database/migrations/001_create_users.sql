-- Migration: 001_create_users
-- Description: Create the users table

CREATE TABLE IF NOT EXISTS users (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255)    UNIQUE NOT NULL,
    name        VARCHAR(255),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);