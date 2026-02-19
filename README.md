# Notion OAuth Integration

A full-stack application integrating Notion's REST API with OAuth authentication, token management, and secure session handling.

## Important: MCP vs REST API

**Notion's MCP endpoint (`mcp.notion.com`) does NOT accept OAuth tokens.** OAuth access tokens (starting with `ntn_`) only work with Notion's REST API (`api.notion.com`).

This implementation uses **Notion's REST API directly** for all operations, which properly supports OAuth tokens obtained through the OAuth flow.

### Supported Operations

| Frontend Action | Backend Operation | Notion REST API Call |
|-----------------|-------------------|----------------------|
| `list_pages` | `search_pages` | `POST /v1/search` with `filter: { property: "object", value: "page" }` |
| `list_databases` | `search_databases` | `POST /v1/search` with `filter: { property: "object", value: "database" }` |
| `search_pages` | `search_pages` | Same as above |
| `get_page` | `get_page` | `GET /v1/pages/{pageId}` |
| `get_database` | `get_database` | `GET /v1/databases/{databaseId}` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────────┐        │
│  │ Home Page    │  │ Callback   │  │ Dashboard            │        │
│  │ (Connect)    │  │ (OAuth)    │  │ (Notion Data)        │        │
│  └──────┬───────┘  └─────┬──────┘  └──────────┬───────────┘        │
│         │                │                    │                     │
└─────────┼────────────────┼────────────────────┼─────────────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND (Port 3000)                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Next.js Rewrites (API Proxy)                                │   │
│  │  /api/auth/*  → http://localhost:4000/auth/*                │   │
│  │  /api/notion/* → http://localhost:4000/notion/*             │   │
│  │  /api/health  → http://localhost:4000/health                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Benefits:                                                           │
│  • Same-origin requests (no CORS issues)                            │
│  • Session cookies work seamlessly                                  │
│  • Clean API client with relative URLs                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND (Port 4000)                      │
│                                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ Session     │ │ OAuth       │ │ Token       │ │ Notion API  │   │
│  │ (Redis)     │ │ (PKCE)      │ │ (Encrypted) │ │ (REST)      │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
│         │               │               │               │           │
└─────────┼───────────────┼───────────────┼───────────────┼───────────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
     ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
     │  Redis  │    │ Notion   │    │PostgreSQL│    │  Notion  │
     │ (Cache) │    │  OAuth   │    │ (Tokens) │    │REST API  │
     └─────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## Data Flow Pipeline

### 1. OAuth Connection Flow

```
User clicks "Connect Notion"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/notion/connect                                   │
│                                                                  │
│ 1. Generate PKCE verifier & challenge (S256)                    │
│ 2. Generate random state parameter                              │
│ 3. Store state + encrypted verifier in database                 │
│ 4. Build authorization URL                                      │
│ 5. Return URL to frontend                                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
User authorizes on Notion
         │
         ▼
Notion redirects to /callback?code=...&state=...
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/notion/callback                                  │
│                                                                  │
│ 1. Validate state (exists, not expired, not consumed)           │
│ 2. Decrypt PKCE verifier                                        │
│ 3. Exchange code for tokens (with PKCE + Basic Auth)            │
│ 4. Encrypt access_token & refresh_token (AES-256-GCM)           │
│ 5. Store encrypted tokens in PostgreSQL                         │
│ 6. Mark state as consumed                                       │
│ 7. Return success                                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
User redirected to Dashboard
```

### 2. Notion API Request Flow

```
User clicks "Pages" or "Databases"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/notion/query                                          │
│ Body: { action: "list_pages", params: {} }                      │
│                                                                  │
│ 1. Validate session → get user_id                               │
│ 2. Get encrypted token from PostgreSQL                          │
│ 3. Decrypt token (AES-256-GCM)                                  │
│ 4. Check token expiry (refresh if needed)                       │
│ 5. Map action: "list_pages" → "search_pages"                    │
│ 6. Call Notion REST API: POST /v1/search                        │
│    Headers:                                                     │
│      Authorization: Bearer <access_token>                       │
│      Notion-Version: 2022-06-28                                 │
│    Body:                                                        │
│      { page_size: 20, filter: { property: "object",             │
│        value: "page" } }                                        │
│ 7. Transform response:                                          │
│    { results: [...] } → { pages: [...], databases: [...] }      │
│ 8. Return transformed response                                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
Frontend renders pages/databases
```

---

## Project Structure

```
notion_connector/
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── app/                      # App Router pages
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Home page
│   │   │   ├── callback/             # OAuth callback
│   │   │   │   └── page.tsx
│   │   │   ├── connect/              # Connect Notion page
│   │   │   │   └── page.tsx
│   │   │   └── dashboard/            # Dashboard (Notion data)
│   │   │       └── page.tsx
│   │   │
│   │   ├── components/               # React components
│   │   │   ├── notion/
│   │   │   │   ├── ConnectButton.tsx       # "Connect Notion" button
│   │   │   │   ├── ConnectionStatus.tsx    # Connection status display
│   │   │   │   ├── DisconnectButton.tsx    # "Disconnect" button
│   │   │   │   └── NotionDataView.tsx      # Pages/databases list
│   │   │   └── ui/
│   │   │       ├── ErrorBanner.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── SuccessToast.tsx
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useNotionConnection.ts      # Connection state
│   │   │   └── useNotionData.ts            # Data fetching
│   │   │
│   │   ├── lib/                      # Utilities
│   │   │   └── api-client.ts               # HTTP client for backend
│   │   │
│   │   ├── types/                    # TypeScript types
│   │   │   └── notion.ts                   # All type definitions
│   │   │
│   │   └── next.config.ts            # Next.js config (rewrites)
│   │
│   └── server/                       # Express Backend
│       ├── src/
│       │   ├── index.ts              # Server entry point
│       │   │
│       │   ├── config/               # Configuration
│       │   │   ├── environment.ts          # Env var loading
│       │   │   └── constants.ts            # App constants
│       │   │
│       │   ├── database/             # Database layer
│       │   │   ├── client.ts               # PostgreSQL client
│       │   │   ├── migrations/             # SQL migrations
│       │   │   │   ├── 001_create_users.sql
│       │   │   │   ├── 002_create_notion_connections.sql
│       │   │   │   └── 003_create_oauth_states.sql
│       │   │   └── seeds/
│       │   │
│       │   ├── middleware/           # Express middleware
│       │   │   ├── session.middleware.ts    # Redis sessions
│       │   │   ├── auth.middleware.ts       # Auth check
│       │   │   ├── csrf.middleware.ts       # CSRF protection
│       │   │   └── rate-limit.middleware.ts # Rate limiting
│       │   │
│       │   ├── modules/              # Business logic
│       │   │   ├── oauth/                  # OAuth module
│       │   │   │   ├── discovery.service.ts    # OAuth endpoint discovery
│       │   │   │   ├── pkce.service.ts         # PKCE generation
│       │   │   │   ├── authorization.service.ts # Auth URL builder
│       │   │   │   ├── callback.service.ts     # Code exchange
│       │   │   │   └── oauth.types.ts
│       │   │   │
│       │   │   ├── token/                  # Token management
│       │   │   │   ├── token.service.ts        # Token operations
│       │   │   │   ├── token.encryption.ts     # AES-256-GCM
│       │   │   │   ├── token.repository.ts     # DB operations
│       │   │   │   └── token.types.ts
│       │   │   │
│       │   │   ├── mcp/                    # Notion API module
│       │   │   │   ├── notion-api.service.ts   # REST API calls
│       │   │   │   ├── mcp-request.handler.ts  # Request orchestration
│       │   │   │   └── mcp.types.ts
│       │   │   │
│       │   │   └── user/                   # User management
│       │   │       ├── user.service.ts
│       │   │       └── user.repository.ts
│       │   │
│       │   ├── routes/               # API routes
│       │   │   ├── auth.routes.ts          # /auth/notion/*
│       │   │   ├── notion.routes.ts        # /notion/*
│       │   │   └── health.routes.ts        # /health
│       │   │
│       │   └── utils/                # Utilities
│       │       ├── crypto.ts               # Crypto helpers
│       │       ├── logger.ts               # Logging
│       │       └── errors.ts               # Error classes
│       │
│       └── tests/                    # Test files
│
├── docker-compose.yml                # PostgreSQL + Redis
├── .env                              # Environment variables
├── package.json                      # Monorepo scripts
└── README.md                         # This file
```

---

## Key Features

- **OAuth 2.0 + PKCE**: Secure authentication with Notion
- **Server-side Token Storage**: Encrypted tokens stored in PostgreSQL
- **Session Management**: Redis-backed sessions with HttpOnly cookies
- **Notion REST API Integration**: Direct API calls with OAuth tokens
- **Token Refresh**: Automatic refresh with distributed locking
- **CSRF Protection**: Origin/Referer validation

---

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Notion Integration (Client ID & Secret)

---

## Quick Start

### 1. Start Infrastructure Services

```bash
cd notion_connector
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 2. Configure Environment

The `.env` file contains all configuration. Key variables:

```env
# Notion OAuth (from your Notion integration settings)
NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret
NOTION_REDIRECT_URI=http://localhost:3000/callback

# Backend URL (for Next.js proxy)
BACKEND_URL=http://localhost:4000

# Security (generate your own for production!)
TOKEN_ENCRYPTION_KEY=  # 32 bytes, base64 encoded
SESSION_SECRET=        # 64+ character random string
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:server  # Backend on port 4000
npm run dev:web     # Frontend on port 3000
```

### 6. Open the Application

Navigate to http://localhost:3000

---

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/notion/connect` | POST | Initiates OAuth flow, returns authorization URL |
| `/api/auth/notion/callback` | POST | Completes OAuth flow, exchanges code for tokens |

### Notion Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notion/status` | GET | Returns connection status |
| `/api/notion/query` | POST | Execute Notion API operations |
| `/api/notion/disconnect` | POST | Disconnect Notion integration |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check endpoint |

---

## Security Architecture

### Token Storage
- Access and refresh tokens are encrypted with AES-256-GCM
- Each token has a unique IV (initialization vector)
- Encryption key stored in environment variable (never in database)

### Session Cookies
- HttpOnly: Not accessible via JavaScript
- Secure: HTTPS only in production
- SameSite=Lax: CSRF protection while allowing OAuth redirects
- Redis-backed: Scalable session storage

### CSRF Protection
- Origin/Referer header validation on mutating requests
- State parameter in OAuth flow (one-time use, expires in 10 minutes)

---

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start both servers
npm run dev:server       # Start backend only
npm run dev:web          # Start frontend only

# Database
npm run migrate          # Run migrations
npm run seed             # Seed database

# Production
npm run build            # Build both apps
npm run start            # Start backend in production

# Docker
npm run docker:up        # Start PostgreSQL + Redis
npm run docker:down      # Stop containers
npm run docker:logs      # View container logs
```

---

## Troubleshooting

### Empty Results from Notion API

**Cause**: Pages not shared with the integration.

**Fix**:
1. Open Notion
2. Go to a page you want to access
3. Click "..." → "Add connections"
4. Select your integration
5. The page will now appear in search results

### Session Not Persisting

1. Check that cookies are being set (DevTools → Application → Cookies)
2. Verify `credentials: "include"` in API requests
3. Ensure `APP_URL` matches your frontend URL exactly

### OAuth Fails

1. Verify `NOTION_REDIRECT_URI` matches exactly in Notion integration settings
2. Check that state parameter is being passed correctly
3. Verify PKCE verifier is being stored and retrieved

### Database Connection Issues

1. Ensure PostgreSQL is running: `docker compose ps`
2. Check `DATABASE_URL` format
3. Run migrations: `npm run migrate`

---

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
NODE_ENV=production
APP_URL=https://your-domain.com
NOTION_REDIRECT_URI=https://your-domain.com/callback
TOKEN_ENCRYPTION_KEY=<generate-new-32-byte-key>
SESSION_SECRET=<generate-new-64-char-secret>
DATABASE_URL=<production-postgresql-url>
REDIS_URL=<production-redis-url>
```

### Security Checklist

- [ ] Generate new `TOKEN_ENCRYPTION_KEY` (32 bytes, base64)
- [ ] Generate new `SESSION_SECRET` (64+ random characters)
- [ ] Enable HTTPS
- [ ] Set `secure: true` for cookies (automatic in production)
- [ ] Configure rate limiting appropriately
- [ ] Review CORS settings for your domain

---

## License

MIT
