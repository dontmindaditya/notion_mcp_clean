import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPool, closePool } from "../client";
import { logger } from "../../utils/logger";

/**
 * Seed script for development data.
 * 
 * Usage: npm run seed
 * 
 * Reads and executes SQL seed files from this directory.
 * Only intended for development/testing environments.
 */
async function runSeeds(): Promise<void> {
  const pool = getPool();
  
  try {
    logger.info("Running database seeds...");
    
    // Read the dev seed SQL file
    const seedPath = join(__dirname, "001_dev_seed.sql");
    const seedSQL = readFileSync(seedPath, "utf-8");
    
    // Execute the seed
    await pool.query(seedSQL);
    
    logger.info("Database seeds completed successfully");
  } catch (err) {
    logger.error("Failed to run seeds", { error: (err as Error).message });
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
runSeeds();
