import type { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/environment";
import { getRedis } from "./session.middleware";
import { RateLimitError } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Per-user (or per-IP for unauthenticated requests) rate limiter.
 *
 * Uses a simple Redis INCR + EXPIRE sliding window. When the counter
 * exceeds the configured max, returns 429 with Retry-After header.
 *
 * On Redis failure the request is allowed through (fail-open) so a
 * Redis blip doesn't take down the whole API.
 */
export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  applyRateLimit(req, res, next).catch((err) => {
    logger.error("Rate limiter internal error — failing open", {
      error: (err as Error).message,
    });
    next(); // fail-open
  });
}

async function applyRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const env = getEnv();
  const redis = getRedis();

  const identifier = req.session?.userId || req.ip || "anon";
  const key = `rl:${identifier}`;

  const windowSeconds = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);
  const max = env.RATE_LIMIT_MAX_REQUESTS;

  // Atomic increment
  const current = await redis.incr(key);

  // Set TTL only on the first request in the window
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  // Fetch remaining TTL for headers
  const ttl = await redis.ttl(key);

  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - current)));
  res.setHeader("X-RateLimit-Reset", String(Date.now() + ttl * 1000));

  if (current > max) {
    const retryAfter = Math.max(1, ttl);
    res.setHeader("Retry-After", String(retryAfter));

    logger.warn("Rate limit exceeded", { identifier, current, max });

    const err = new RateLimitError(retryAfter);
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  next();
}