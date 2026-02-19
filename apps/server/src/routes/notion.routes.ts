import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth.middleware";
import {
  getConnectionStatus,
  disconnect,
} from "../modules/token/token.service";
import { executeMCPToolCall } from "../modules/mcp/mcp-request.handler";
import { AppError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = Router();

// ─── Input validation ───────────────────────────────────────────────

const queryBodySchema = z.object({
  action: z
    .string({ required_error: "action is required" })
    .min(1, "action must not be empty"),
  params: z.record(z.unknown()).optional(),
});

// ─── GET /notion/status ─────────────────────────────────────────────
//
// Returns the current Notion connection status for the authed user:
//   { connected, workspace_name, workspace_id, connected_at, status }
// ─────────────────────────────────────────────────────────────────────

router.get(
  "/notion/status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const status = await getConnectionStatus(userId);
      res.json({ data: status });
    } catch (err) {
      handleRouteError(res, err, "Failed to check connection status");
    }
  }
);

// ─── POST /notion/query ─────────────────────────────────────────────
//
// Proxies an MCP tool call to Notion:
//   Body: { action: string, params?: Record<string, unknown> }
//
// The backend:
//   1. Resolves & decrypts the user's access token
//   2. Connects to Notion MCP (HTTP → SSE fallback)
//   3. Sends the tool call
//   4. Retries once on 401 (after token refresh)
//   5. Returns the MCP result
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/notion/query",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const parsed = queryBodySchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join("; ");
        throw new ValidationError(msg);
      }

      const { action, params } = parsed.data;

      logger.info("MCP query", { userId, action });

      const result = await executeMCPToolCall(userId, action, params ?? {});

      res.json({ data: result });
    } catch (err) {
      handleRouteError(res, err, "Failed to query Notion");
    }
  }
);

// ─── POST /notion/disconnect ────────────────────────────────────────
//
// Disconnects the user from Notion:
//   1. Clears encrypted tokens from DB
//   2. Marks connection as "disconnected"
//   3. Invalidates MCP connection cache
//   4. Clears Redis token cache
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/notion/disconnect",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      logger.info("Disconnect requested", { userId });

      await disconnect(userId);

      res.json({ data: { success: true } });
    } catch (err) {
      handleRouteError(res, err, "Failed to disconnect from Notion");
    }
  }
);

// ─── Shared error handler ───────────────────────────────────────────

function handleRouteError(
  res: Response,
  err: unknown,
  fallbackMsg: string
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  logger.error("Unhandled error in notion route", {
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