import { z } from "zod";

const envSchema = z.object({
  // Notion OAuth
  NOTION_CLIENT_ID: z.string().min(1, "NOTION_CLIENT_ID is required"),
  NOTION_CLIENT_SECRET: z.string().default(""),
  NOTION_REDIRECT_URI: z.string().url("NOTION_REDIRECT_URI must be a valid URL"),

  // MCP
  MCP_SERVER_URL: z.string().url().default("https://mcp.notion.com"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Security
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1, "TOKEN_ENCRYPTION_KEY is required")
    .refine(
      (val) => {
        try {
          const buf = Buffer.from(val, "base64");
          return buf.length === 32;
        } catch {
          return false;
        }
      },
      { message: "TOKEN_ENCRYPTION_KEY must be 32 bytes base64-encoded" }
    ),
  SESSION_SECRET: z
    .string()
    .min(64, "SESSION_SECRET must be at least 64 characters"),

  // Application
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\n❌ Environment validation failed:\n${formatted}\n`);
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    return loadEnv();
  }
  return _env;
}