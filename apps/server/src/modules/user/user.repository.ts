import { query } from "../../database/client";

// ─── Row type ───────────────────────────────────────────────────────
export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Queries ────────────────────────────────────────────────────────

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function createUser(
  email: string,
  name?: string
): Promise<UserRow> {
  const result = await query<UserRow>(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *`,
    [email, name ?? null]
  );
  return result.rows[0];
}

/**
 * Find a user by email — if not found, create one atomically.
 * Uses INSERT … ON CONFLICT to avoid race conditions.
 */
export async function findOrCreateUser(
  email: string,
  name?: string
): Promise<UserRow> {
  const result = await query<UserRow>(
    `INSERT INTO users (email, name)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [email, name ?? null]
  );
  return result.rows[0];
}