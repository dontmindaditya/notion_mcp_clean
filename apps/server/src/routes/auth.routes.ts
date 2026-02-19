import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth.middleware";
import { buildAuthorizationUrl } from "../modules/oauth/authorization.service";
import { handleCallback } from "../modules/oauth/callback.service";
import { AppError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = Router();

// ─── Input validation ───────────────────────────────────────────────

const callbackBodySchema = z.object({
  code: z
    .string({ required_error: "Authorization code is required" })
    .min(1, "Authorization code must not be empty"),
  state: z
    .string({ required_error: "State parameter is required" })
    .min(1, "State parameter must not be empty"),
});

// ─── POST /auth/notion/connect ──────────────────────────────────────
//
// Initiates the OAuth + PKCE flow:
//   1. Discovers Notion's OAuth metadata
//   2. Generates PKCE verifier + challenge
//   3. Generates state, stores in DB
//   4. Returns { url } for the frontend to redirect to
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/auth/notion/connect",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      logger.info("OAuth connect initiated", { userId });

      const url = await buildAuthorizationUrl(userId);

      res.json({ data: { url } });
    } catch (err) {
      handleRouteError(res, err, "Failed to initiate Notion connection");
    }
  }
);

// ─── POST /auth/notion/callback ─────────────────────────────────────
//
// Completes the OAuth flow:
//   1. Validates state (CSRF, expiry, replay)
//   2. Retrieves & decrypts PKCE verifier
//   3. Exchanges code for tokens
//   4. Encrypts & stores tokens
//   5. Returns { success, workspace_name }
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/auth/notion/callback",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // Validate input
      const parsed = callbackBodySchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join("; ");
        throw new ValidationError(msg);
      }

      const { code, state } = parsed.data;

      logger.info("OAuth callback processing", { userId });

      const result = await handleCallback(code, state, userId);

      res.json({ data: result });
    } catch (err) {
      handleRouteError(res, err, "Failed to complete Notion connection");
    }
  }
);

// ─── Shared error handler for this router ───────────────────────────

function handleRouteError(res: Response, err: unknown, fallbackMsg: string): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  logger.error("Unhandled error in auth route", {
    error: (err as Error).message,
    stack: (err as Error).stack,
  });

  res.status(500).json({
    error: {
      code: "internal_error",
      message: fallbackMsg,
      retryable: true,
    },
  });
}

export default router;