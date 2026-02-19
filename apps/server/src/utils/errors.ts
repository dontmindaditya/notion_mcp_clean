import { ERROR_CODES } from "../config/constants";

// ─── Base Application Error ─────────────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    retryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
      },
    };
  }
}

// ─── OAuth Errors ───────────────────────────────────────────────────
export class OAuthDiscoveryError extends AppError {
  constructor(message: string) {
    super(message, 502, ERROR_CODES.NOTION_UNAVAILABLE, true);
  }
}

export class OAuthStateError extends AppError {
  constructor(message: string) {
    super(message, 403, ERROR_CODES.INTERNAL_ERROR, false);
  }
}

export class TokenExchangeError extends AppError {
  constructor(message: string) {
    super(message, 502, ERROR_CODES.NOTION_UNAVAILABLE, true);
  }
}

// ─── Token Errors ───────────────────────────────────────────────────
export class ReconnectionRequired extends AppError {
  constructor(message: string = "Notion connection expired. Please reconnect.") {
    super(message, 401, ERROR_CODES.RECONNECTION_REQUIRED, false);
  }
}

export class NoConnectionError extends AppError {
  constructor() {
    super("No Notion connection found", 404, ERROR_CODES.RECONNECTION_REQUIRED, false);
  }
}

export class TokenRefreshError extends AppError {
  constructor(message: string) {
    super(message, 502, ERROR_CODES.NOTION_UNAVAILABLE, true);
  }
}

export class ConcurrentRefreshTimeout extends AppError {
  constructor() {
    super(
      "Token refresh in progress, please try again",
      503,
      ERROR_CODES.NOTION_UNAVAILABLE,
      true
    );
  }
}

// ─── MCP Errors ─────────────────────────────────────────────────────
export class MCPConnectionError extends AppError {
  constructor(message: string) {
    super(message, 503, ERROR_CODES.NOTION_UNAVAILABLE, true);
  }
}

export class MCPRequestError extends AppError {
  constructor(message: string) {
    super(message, 502, ERROR_CODES.NOTION_UNAVAILABLE, true);
  }
}

// ─── Auth Errors ────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, ERROR_CODES.INTERNAL_ERROR, false);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, ERROR_CODES.INTERNAL_ERROR, false);
  }
}

// ─── Rate Limit ─────────────────────────────────────────────────────
export class RateLimitError extends AppError {
  public readonly retryAfter: number;
  constructor(retryAfter: number) {
    super("Too many requests, please slow down", 429, ERROR_CODES.RATE_LIMITED, true);
    this.retryAfter = retryAfter;
  }
}

// ─── Validation ─────────────────────────────────────────────────────
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, ERROR_CODES.INTERNAL_ERROR, false);
  }
}