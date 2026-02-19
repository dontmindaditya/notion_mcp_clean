import {
  findUserById,
  findOrCreateUser,
  type UserRow,
} from "./user.repository";

/** Get an existing user by primary key. */
export async function getUserById(id: string): Promise<UserRow | null> {
  return findUserById(id);
}

/**
 * Guarantee a user row exists for the given email.
 * Creates one atomically if it doesn't exist (ON CONFLICT).
 * Used during session bootstrap / dev auto-login.
 */
export async function ensureUser(
  email: string,
  name?: string
): Promise<UserRow> {
  return findOrCreateUser(email, name);
}