/**
 * MCP Request Handler
 * 
 * This module provides a unified interface for executing Notion operations.
 * It uses the Notion REST API directly instead of the MCP endpoint,
 * because Notion's MCP endpoint (mcp.notion.com) does NOT accept OAuth tokens.
 * 
 * OAuth tokens (ntn_*) only work with api.notion.com.
 */

import { logger } from "../../utils/logger";
import { MCPRequestError } from "../../utils/errors";
import { getValidAccessToken, refreshAccessToken } from "../token/token.service";
import { touchLastUsed } from "../token/token.repository";
import {
  searchNotion,
  getPage,
  getDatabase,
  queryDatabase,
  getBotUser,
  listUsers,
  type NotionPage,
  type NotionDatabase,
  type NotionSearchResult,
} from "./notion-api.service";

// Re-export types for backwards compatibility
export type { NotionPage, NotionDatabase, NotionSearchResult };

/**
 * Operation mapping from frontend actions to backend operations.
 * This provides backward compatibility for MCP-style action names.
 */
const OPERATION_MAP: Record<string, string> = {
  // Frontend action names → Backend operation names
  "list_pages": "search_pages",
  "list_databases": "search_databases",
  "search_pages": "search_pages",
  "search_databases": "search_databases",
  
  // MCP-style tool names → Backend operation names
  "notion_search": "search",
  "notion_get_page": "get_page",
  "notion_get_database": "get_database",
  "notion_query_database": "query_database",
  "notion_get_user": "get_user",
  "notion_list_users": "list_users",
};

/**
 * Execute a Notion operation for a user.
 *
 * Supported operations:
 * - search: Search pages and databases
 * - search_pages: Search only pages
 * - search_databases: Search only databases
 * - list_pages: List all pages (alias for search_pages)
 * - list_databases: List all databases (alias for search_databases)
 * - get_page: Get a specific page
 * - get_database: Get a specific database
 * - query_database: Query a database for pages
 * - get_user: Get bot user info
 * - list_users: List workspace users
 */
export async function executeNotionOperation(
  userId: string,
  operation: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const accessToken = await getValidAccessToken(userId);

  // Map the operation name (backward compatibility)
  const mappedOperation = OPERATION_MAP[operation] || operation;

  try {
    const result = await executeOperation(accessToken, mappedOperation, params);

    // Update last used (fire-and-forget)
    touchLastUsed(userId).catch(() => {});

    return result;
  } catch (err) {
    // Handle auth failure (401) — refresh and retry once
    if (isAuthError(err)) {
      logger.warn("Notion API returned 401, refreshing token and retrying", { userId });

      try {
        const newToken = await refreshAccessToken(userId);
        const result = await executeOperation(newToken, mappedOperation, params);
        touchLastUsed(userId).catch(() => {});
        return result;
      } catch (retryErr) {
        logger.error("Retry after token refresh failed", {
          userId,
          error: (retryErr as Error).message,
        });
        throw retryErr;
      }
    }

    throw err;
  }
}

/**
 * Execute a specific operation using the Notion API
 */
async function executeOperation(
  accessToken: string,
  operation: string,
  params: Record<string, unknown>
): Promise<unknown> {
  logger.debug("Executing Notion operation", { operation, paramsKeys: Object.keys(params) });

  switch (operation) {
    case "search":
      return searchNotion(accessToken, params.query as string, {
        pageSize: params.pageSize as number,
        startCursor: params.startCursor as string,
        filter: params.filter as { property: "object"; value: "page" | "database" },
      }).then(transformSearchResult);

    case "search_pages":
    case "list_pages":
      // List/search pages only
      return searchNotion(accessToken, params.query as string, {
        pageSize: (params.pageSize as number) ?? 20,
        startCursor: params.startCursor as string,
        filter: { property: "object", value: "page" },
      }).then(transformSearchResult);

    case "search_databases":
    case "list_databases":
      // List/search databases only
      return searchNotion(accessToken, params.query as string, {
        pageSize: (params.pageSize as number) ?? 20,
        startCursor: params.startCursor as string,
        filter: { property: "object", value: "database" },
      }).then(transformSearchResult);

    case "get_page":
      if (!params.pageId) {
        throw new MCPRequestError("pageId is required for get_page operation");
      }
      return getPage(accessToken, params.pageId as string);

    case "get_database":
      if (!params.databaseId) {
        throw new MCPRequestError("databaseId is required for get_database operation");
      }
      return getDatabase(accessToken, params.databaseId as string);

    case "query_database":
      if (!params.databaseId) {
        throw new MCPRequestError("databaseId is required for query_database operation");
      }
      return queryDatabase(accessToken, params.databaseId as string, {
        pageSize: params.pageSize as number,
        startCursor: params.startCursor as string,
        filter: params.filter as Record<string, unknown>,
        sorts: params.sorts as Array<{ property: string; direction: "ascending" | "descending" }>,
      }).then(transformSearchResult);

    case "get_user":
      return getBotUser(accessToken);

    case "list_users":
      return listUsers(accessToken, {
        pageSize: params.pageSize as number,
        startCursor: params.startCursor as string,
      });

    default:
      throw new MCPRequestError(`Unknown operation: ${operation}`);
  }
}

/**
 * Transform Notion API search result to frontend-expected format.
 * 
 * Notion API returns: { results: [...], has_more: boolean, ... }
 * Frontend expects: { pages: [...], databases: [...], raw: ... }
 */
function transformSearchResult(result: NotionSearchResult): {
  pages: Array<{
    id: string;
    title: string | null;
    url: string | null;
    icon: string | null;
    last_edited: string | null;
    parent_type: string | null;
  }>;
  databases: Array<{
    id: string;
    title: string | null;
    url: string | null;
    icon: string | null;
    description: string | null;
  }>;
  raw: unknown;
} {
  const pages: Array<{
    id: string;
    title: string | null;
    url: string | null;
    icon: string | null;
    last_edited: string | null;
    parent_type: string | null;
  }> = [];

  const databases: Array<{
    id: string;
    title: string | null;
    url: string | null;
    icon: string | null;
    description: string | null;
  }> = [];

  for (const item of result.results || []) {
    if (item.object === "page") {
      const page = item as NotionPage;
      pages.push({
        id: page.id,
        title: extractPageTitle(page),
        url: (page as any).url ?? null,
        icon: extractIcon((page as any).icon),
        last_edited: (page as any).last_edited_time ?? null,
        parent_type: (page as any).parent?.type ?? null,
      });
    } else if (item.object === "database") {
      const db = item as NotionDatabase;
      databases.push({
        id: db.id,
        title: extractDatabaseTitle(db),
        url: (db as any).url ?? null,
        icon: extractIcon((db as any).icon),
        description: (db as any).description?.[0]?.plain_text ?? null,
      });
    }
  }

  return {
    pages,
    databases,
    raw: result,
  };
}

/**
 * Extract title from a Notion page object.
 * Pages store titles in properties.title or properties.Name
 */
function extractPageTitle(page: NotionPage): string | null {
  const props = (page as any).properties;
  if (!props) return null;

  // Try common title property names
  const titleProp = props.title ?? props.Title ?? props.Name ?? props.name;
  if (titleProp?.title?.[0]?.plain_text) {
    return titleProp.title[0].plain_text;
  }

  // Try to find any title-type property
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop?.type === "title" && prop.title?.[0]?.plain_text) {
      return prop.title[0].plain_text;
    }
  }

  return null;
}

/**
 * Extract title from a Notion database object.
 */
function extractDatabaseTitle(db: NotionDatabase): string | null {
  const title = db.title;
  if (Array.isArray(title) && title[0]?.plain_text) {
    return title[0].plain_text;
  }
  return null;
}

/**
 * Extract icon from Notion icon object.
 */
function extractIcon(icon: any): string | null {
  if (!icon) return null;
  if (icon.type === "emoji" && icon.emoji) return icon.emoji;
  if (icon.type === "external" && icon.external?.url) return "🖼️";
  if (icon.type === "file" && icon.file?.url) return "🖼️";
  return null;
}

/**
 * Legacy function names for backwards compatibility
 * These map to the new operation-based approach
 */
export async function executeMCPToolCall(
  userId: string,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<unknown> {
  // Map MCP tool names to operations
  const operation = OPERATION_MAP[toolName] || toolName;
  return executeNotionOperation(userId, operation, toolArgs);
}

// Keep for backwards compatibility
export async function executeMCPRequest(
  userId: string,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  return executeNotionOperation(userId, method, params || {});
}

// ─── Helpers ────────────────────────────────────────────────────────

function isAuthError(err: unknown): boolean {
  return (
    err instanceof Error &&
    ((err as any).status === 401 || err.message.includes("authentication"))
  );
}
