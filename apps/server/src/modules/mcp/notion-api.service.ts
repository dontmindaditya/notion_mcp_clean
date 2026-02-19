/**
 * Notion API Service
 * 
 * This service interacts with Notion's REST API directly instead of the MCP endpoint,
 * because Notion's MCP endpoint (mcp.notion.com) does NOT accept OAuth tokens.
 * OAuth tokens (ntn_*) only work with api.notion.com.
 */

import { logger } from "../../utils/logger";
import { MCPRequestError } from "../../utils/errors";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface NotionPage {
  id: string;
  object: "page";
  created_time: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
  url: string;
  parent?: {
    type: string;
    database_id?: string;
    page_id?: string;
  };
  archived: boolean;
}

export interface NotionDatabase {
  id: string;
  object: "database";
  created_time: string;
  last_edited_time: string;
  title: Array<{ plain_text: string }>;
  description: Array<{ plain_text: string }>;
  url: string;
  parent?: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  };
}

export interface NotionSearchResult {
  object: "list";
  results: Array<NotionPage | NotionDatabase>;
  has_more: boolean;
  next_cursor: string | null;
}

export interface NotionUser {
  object: "user";
  id: string;
  name: string;
  type: string;
  avatar_url?: string;
}

/**
 * Make an authenticated request to Notion's REST API
 */
async function notionFetch(
  accessToken: string,
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
  } = {}
): Promise<Response> {
  const { method = "GET", body } = options;
  const url = `${NOTION_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "Notion-Version": NOTION_VERSION,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  logger.debug("Notion API request", { method, endpoint });

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  return response;
}

/**
 * Search Notion pages and databases
 * https://developers.notion.com/reference/post-search
 */
export async function searchNotion(
  accessToken: string,
  query?: string,
  options: {
    pageSize?: number;
    startCursor?: string;
    filter?: {
      property: "object";
      value: "page" | "database";
    };
  } = {}
): Promise<NotionSearchResult> {
  const body: Record<string, unknown> = {
    page_size: options.pageSize ?? 10,
  };

  if (query) {
    body.query = query;
  }

  if (options.startCursor) {
    body.start_cursor = options.startCursor;
  }

  if (options.filter) {
    body.filter = options.filter;
  }

  logger.info("Notion search request", {
    body: JSON.stringify(body),
    hasQuery: !!query,
    filter: options.filter,
  });

  const response = await notionFetch(accessToken, "/search", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Notion search failed", {
      status: response.status,
      error: errorText,
    });

    if (response.status === 401) {
      const error = new Error("Notion authentication failed") as Error & { status: number };
      error.status = 401;
      throw error;
    }

    throw new MCPRequestError(`Notion search failed: ${response.status} ${errorText}`);
  }

  const result = await response.json() as NotionSearchResult;
  
  logger.info("Notion search response", {
    resultCount: result.results?.length ?? 0,
    hasMore: result.has_more,
    nextCursor: result.next_cursor,
    firstResult: result.results?.[0] ? {
      id: result.results[0].id,
      object: result.results[0].object,
    } : null,
  });

  return result;
}

/**
 * Get a specific page by ID
 * https://developers.notion.com/reference/retrieve-a-page
 */
export async function getPage(
  accessToken: string,
  pageId: string
): Promise<NotionPage> {
  const response = await notionFetch(accessToken, `/pages/${pageId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new MCPRequestError(`Failed to get page: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<NotionPage>;
}

/**
 * Get a specific database by ID
 * https://developers.notion.com/reference/retrieve-a-database
 */
export async function getDatabase(
  accessToken: string,
  databaseId: string
): Promise<NotionDatabase> {
  const response = await notionFetch(accessToken, `/databases/${databaseId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new MCPRequestError(`Failed to get database: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<NotionDatabase>;
}

/**
 * Query a database for pages
 * https://developers.notion.com/reference/post-database-query
 */
export async function queryDatabase(
  accessToken: string,
  databaseId: string,
  options: {
    pageSize?: number;
    startCursor?: string;
    filter?: Record<string, unknown>;
    sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
  } = {}
): Promise<NotionSearchResult> {
  const body: Record<string, unknown> = {
    page_size: options.pageSize ?? 10,
  };

  if (options.startCursor) {
    body.start_cursor = options.startCursor;
  }

  if (options.filter) {
    body.filter = options.filter;
  }

  if (options.sorts) {
    body.sorts = options.sorts;
  }

  const response = await notionFetch(accessToken, `/databases/${databaseId}/query`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new MCPRequestError(`Database query failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<NotionSearchResult>;
}

/**
 * Get the current bot user info
 * https://developers.notion.com/reference/get-self
 */
export async function getBotUser(accessToken: string): Promise<NotionUser> {
  const response = await notionFetch(accessToken, "/users/me");

  if (!response.ok) {
    const errorText = await response.text();
    throw new MCPRequestError(`Failed to get bot user: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<NotionUser>;
}

/**
 * List all users in the workspace (if bot has access)
 * https://developers.notion.com/reference/get-users
 */
export async function listUsers(
  accessToken: string,
  options: { pageSize?: number; startCursor?: string } = {}
): Promise<{ object: "list"; results: NotionUser[]; has_more: boolean }> {
  const params = new URLSearchParams();
  if (options.pageSize) params.set("page_size", String(options.pageSize));
  if (options.startCursor) params.set("start_cursor", options.startCursor);

  const queryString = params.toString();
  const endpoint = `/users${queryString ? `?${queryString}` : ""}`;

  const response = await notionFetch(accessToken, endpoint);

  if (!response.ok) {
    const errorText = await response.text();
    throw new MCPRequestError(`Failed to list users: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<{ object: "list"; results: NotionUser[]; has_more: boolean }>;
}
