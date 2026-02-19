import session from "express-session";
import RedisStore from "connect-redis";
import Redis from "ioredis";
import { getEnv } from "../config/environment";
import { SESSION_MAX_AGE_MS, SESSION_COOKIE_NAME } from "../config/constants";
import { logger } from "../utils/logger";

// ─── Extend express-session typings ─────────────────────────────────
declare module "express-session" {
  interface SessionData {
    userId?: string;
    userEmail?: string;
  }
}

// ─── Redis singleton ────────────────────────────────────────────────
let redisClient: Redis | null = null;

/**
 * Shared Redis client used by:
 *   - session store
 *   - token cache       (token.service → getRedis())
 *   - distributed locks (token.service → getRedis())
 *   - rate limiter      (rate-limit.middleware → getRedis())
 */
export function getRedis(): Redis {
  if (!redisClient) {
    const env = getEnv();
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 200, 3_000);
      },
    });

    redisClient.on("connect", () => logger.info("Redis connected"));
    redisClient.on("error", (err: Error) =>
      logger.error("Redis error", { error: err.message })
    );
    redisClient.on("close", () => logger.warn("Redis connection closed"));
  }
  return redisClient;
}

/** Gracefully close Redis */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis connection closed");
  }
}

// ─── Session Middleware ─────────────────────────────────────────────

/**
 * Create session middleware with Redis-backed storage.
 *
 * Cookie Configuration for Next.js Proxy Architecture:
 *
 * - sameSite: "lax" - Allows cookies on top-level navigations (OAuth redirects)
 *   while providing CSRF protection for same-origin requests.
 *
 * - secure: true in production - Cookies only sent over HTTPS.
 *   In development (localhost), secure is false to allow HTTP.
 *
 * - httpOnly: true - Prevents JavaScript access (XSS protection).
 *
 * - path: "/" - Cookie valid for all paths including /api/* proxy routes.
 *
 * With Next.js rewrites, the browser sees requests as same-origin
 * (both frontend and API on same domain), so session cookies work correctly.
 */
export function createSessionMiddleware(): ReturnType<typeof session> {
  const env = getEnv();
  const redis = getRedis();

  const store = new RedisStore({
    client: redis,
    prefix: "sess:",
    ttl: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });

  const isProduction = env.NODE_ENV === "production";

  return session({
    store,
    name: SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session on each request
    cookie: {
      httpOnly: true,          // Not accessible via JavaScript
      secure: isProduction,    // HTTPS only in production
      sameSite: "lax",         // CSRF protection, allows OAuth redirects
      maxAge: SESSION_MAX_AGE_MS,
      path: "/",               // Valid for all routes including /api/*
    },
  });
}