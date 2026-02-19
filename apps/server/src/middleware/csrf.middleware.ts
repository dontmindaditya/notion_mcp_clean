import type { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/environment";
import { ForbiddenError } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * CSRF protection for state-changing HTTP methods (POST, PUT, DELETE, PATCH).
 *
 * Strategy:
 *   1. If Origin header present → must match APP_URL origin exactly.
 *   2. Else if Referer present → its origin must match APP_URL origin.
 *   3. In production, reject if neither header is present.
 *   4. In development, allow (browsers may omit headers for localhost).
 *
 * GET / HEAD / OPTIONS are exempt (safe methods).
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
  if (SAFE.has(req.method.toUpperCase())) {
    return next();
  }

  const env = getEnv();
  const allowedOrigin = new URL(env.APP_URL).origin;

  // ── Check Origin header (most reliable) ───────────────────────
  const origin = req.headers.origin;
  if (origin) {
    if (origin === allowedOrigin) return next();

    logger.warn("CSRF: Origin mismatch", {
      received: origin,
      expected: allowedOrigin,
      path: req.path,
    });
    return reject(res);
  }

  // ── Fallback to Referer ───────────────────────────────────────
  const referer = req.headers.referer;
  if (referer) {
    try {
      if (new URL(referer).origin === allowedOrigin) return next();
    } catch {
      /* malformed Referer */
    }

    logger.warn("CSRF: Referer mismatch", {
      received: referer,
      expected: allowedOrigin,
      path: req.path,
    });
    return reject(res);
  }

  // ── No origin headers at all ──────────────────────────────────
  if (env.NODE_ENV === "production") {
    logger.warn("CSRF: Missing Origin and Referer in production", {
      path: req.path,
    });
    return reject(res);
  }

  // Development: let it through
  next();
}

function reject(res: Response): void {
  const err = new ForbiddenError("Invalid request origin");
  res.status(err.statusCode).json(err.toJSON());
}