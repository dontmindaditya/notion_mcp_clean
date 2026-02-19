import { Router, type Request, type Response } from "express";
import { getPool } from "../database/client";
import { getRedis } from "../middleware/session.middleware";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /health
 *
 * Returns 200 when all dependencies are reachable, 503 otherwise.
 * No auth required — used by load balancers and monitoring.
 */
router.get("/health", async (_req: Request, res: Response) => {
  const checks: Record<string, "ok" | "error"> = {
    server: "ok",
    database: "ok",
    redis: "ok",
  };

  // ── PostgreSQL ────────────────────────────────────────────────
  try {
    await getPool().query("SELECT 1");
  } catch (err) {
    checks.database = "error";
    logger.error("Health: DB check failed", { error: (err as Error).message });
  }

  // ── Redis ─────────────────────────────────────────────────────
  try {
    await getRedis().ping();
  } catch (err) {
    checks.redis = "error";
    logger.error("Health: Redis check failed", { error: (err as Error).message });
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  res.status(healthy ? 200 : 503).json({
    data: {
      status: healthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;