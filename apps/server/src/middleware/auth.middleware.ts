import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Middleware that requires an authenticated session.
 *
 * Checks req.session.userId — if absent returns 401 using the
 * standard error envelope so the frontend can react accordingly.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = req.session?.userId;

  if (!userId) {
    logger.warn("Unauthenticated request blocked", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    const err = new UnauthorizedError("Authentication required. Please log in.");
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Attach to a well-known property so route handlers can read it
  // without re-accessing session internals.
  (req as AuthenticatedRequest).userId = userId;
  next();
}

// ─── Typed helper ───────────────────────────────────────────────────

/** Request type that is guaranteed to carry userId (after requireAuth) */
export interface AuthenticatedRequest extends Request {
  userId: string;
}

/**
 * Extract the authenticated user ID from a request.
 * Must only be called after requireAuth middleware.
 */
export function getUserId(req: Request): string {
  const userId =
    (req as AuthenticatedRequest).userId ?? req.session?.userId;
  if (!userId) {
    throw new UnauthorizedError("No authenticated user in request");
  }
  return userId;
}