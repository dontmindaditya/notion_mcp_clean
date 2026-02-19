import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getPool, closePool } from "./client";
import { logger } from "../utils/logger";

/**
 * Database migration script.
 * 
 * Usage: npm run migrate
 * 
 * Reads and executes SQL migration files from the migrations directory
 * in alphabetical order (001_*, 002_*, etc.)
 */
async function runMigrations(): Promise<void> {
  const pool = getPool();
  
  try {
    logger.info("Running database migrations...");
    
    // Get all migration files
    const migrationsDir = join(__dirname, "migrations");
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort(); // Ensure alphabetical order
    
    if (files.length === 0) {
      logger.info("No migration files found");
      return;
    }
    
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Get already applied migrations
    const { rows } = await pool.query("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map(r => r.version));
    
    // Apply each migration in order
    for (const file of files) {
      if (applied.has(file)) {
        logger.debug(`Migration already applied: ${file}`);
        continue;
      }
      
      logger.info(`Applying migration: ${file}`);
      
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, "utf-8");
      
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [file]
        );
        await pool.query("COMMIT");
        logger.info(`Migration applied: ${file}`);
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
    }
    
    logger.info("All migrations completed successfully");
  } catch (err) {
    logger.error("Migration failed", { error: (err as Error).message });
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
runMigrations();
