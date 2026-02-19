import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { getEnv } from "../config/environment";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const env = getEnv();
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on("error", (err) => {
      logger.error("Unexpected database pool error", { error: err.message });
    });

    pool.on("connect", () => {
      logger.debug("New database connection established");
    });
  }
  return pool;
}

/** Execute a query against the pool */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;
  logger.debug("SQL query executed", { text: text.substring(0, 80), duration, rows: result.rowCount });
  return result;
}

/** Get a client from the pool (for transactions) */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/** Run a callback inside a transaction */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Graceful shutdown */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database pool closed");
  }
}