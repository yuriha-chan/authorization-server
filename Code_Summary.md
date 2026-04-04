# Code Summary

## Project Overview

This is an **Authorization Server** - a dual-component application providing agent authentication and authorization management with an admin web interface.

## Files Report

### Directory Structure

```
/app/auth-server/
├── backend/           # Node.js/Express authorization server
│   ├── src/
│   │   ├── index.ts                # Entry point (forks agent & admin servers)
│   │   ├── agent/                  # Agent server module
│   │   ├── admin/                  # Admin server & REST API routes
│   │   │   ├── server.ts           # Express server setup
│   │   │   └── routes/              # REST API routes (agents, grants, notifications, requests, authorizations, events)
│   │   ├── db/                     # TypeORM data source & migrations
│   │   ├── entities/               # TypeORM entities (Authorization, AuthorizationRequest, AgentContainer, GrantAPI, NotificationAPI)
│   │   ├── events/                 # Event pub/sub + Redis stream event logger
│   │   │   │   ├── pubsub.ts       # Redis pub/sub for internal events
│   │   │   │   └── logger.ts        # Redis stream event notifier with log retention
│   │   ├── websocket/              # WebSocket handlers (agent, admin, manager)
│   │   ├── schemas.ts              # Zod validation schemas
│   │   ├── swagger-admin.ts        # Swagger API docs for admin
│   │   └── swagger-agent.ts        # Swagger API docs for agent
│   ├── data/                       # SQLite database storage
│   ├── dist/                       # Compiled JavaScript
│   ├── scripts/                    # Build scripts
│   ├── test/                       # Test files
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
└── frontend/            # React admin interface
    ├── src/
    │   ├── App.jsx           # Main React application
    │   ├── api.js            # API client functions
    │   ├── main.jsx          # Entry point
    │   ├── components/ui/    # UI components
    │   └── assets/           # Static assets
    ├── public/               # Public static files
    ├── dist/                # Built output
    ├── scripts/              # Build scripts
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.js
    └── eslint.config.js
```

## Characteristics Report

### Languages & Frameworks

| Component | Language | Framework/Stack |
|-----------|----------|-----------------|
| Backend | TypeScript | Express, TypeORM (SQLite), Zod, WebSocket (ws) |
| Frontend | JavaScript/JSX | React 19, Chakra UI v3, Vite, next-themes |

### Package Manager

- **pnpm** with workspace configuration (`pnpm-workspace.yaml`)
- Backend allows builds for `sqlite3` via workspace config

### Build & Test Commands

| Command | Location | Description |
|---------|----------|-------------|
| `pnpm build` | backend | TypeScript compilation + Swagger generation |
| `pnpm dev` | backend | Development with ts-node |
| `pnpm start` | backend | Run compiled server |
| `pnpm test` | backend | Run vitest |
| `pnpm migration:run` | backend | Run TypeORM migrations |
| `pnpm migration:generate` | backend | Generate TypeORM migration |
| `pnpm dev` | frontend | Vite dev server |
| `pnpm build` | frontend | Vite build + static copy |
| `pnpm lint` | frontend | ESLint check |

### Code Style

- **Backend**: TypeScript with strict mode, decorators enabled for TypeORM, CommonJS module output
- **Frontend**: React with Chakra UI v3, ESNext modules, custom monospace theme (JetBrains Mono, IBM Plex Sans)
- **No explicit formatter configured** - code uses consistent indentation (2 spaces)

### Project Structure

- **Multi-component**: Forked process architecture where main process spawns separate Agent and Admin servers
- **Database**: SQLite with TypeORM ORM
- **API**: RESTful Express API + WebSocket for real-time updates
- **Frontend**: Single-page admin dashboard

## Semantics Report

### Architecture Design

1. **Process Model**: The main `index.ts` forks two child processes (`agent/server.js` and `admin/server.js`) with automatic restart on exit
2. **Database Layer**: TypeORM entities with SQLite backend for persistence
3. **API Layer**: Express routers for each domain (agents, grants, notifications, requests, authorizations)
4. **Real-time**: WebSocket connections for admin dashboard live updates (single broadcast channel)
5. **Validation**: Zod schemas for request validation
6. **Event Logging**: Redis stream (`event:log`) with 7-day or 1000 log retention; unified `eventNotifier.notify()` writes to stream and broadcasts to WebSocket

### WebSocket & Data Sync Model

**Message Flow:**
1. Internal events (e.g., `request:new`, `request:approved`) are published to `eventBus` (Redis pub/sub)
2. `AdminWebSocket` subscribes to `eventBus` and calls `eventNotifier.notify(type, message, data)`
3. `eventNotifier.notify()` atomically:
   - Writes entry to Redis stream (`event:log`)
   - Triggers broadcast handlers which send to all connected WebSocket clients
4. Frontend receives message via WebSocket, updates relevant state (pending, agents, grants, etc.)
5. Frontend maintains `processedIds` Set to discard duplicate messages (idempotent)

**Broadcast Types:**
- `new_pending_request` - New authorization request
- `request_approved` - Request approved
- `request_denied` - Request denied
- `agent_updated` - Agent created/updated/deleted
- `grant_api_updated` - Grant API created/updated/deleted
- `notification_api_updated` - Notification API created/updated/deleted
- `authorization_revoked` - Authorization revoked
- `notification_delivery_failed` - Notification delivery failed

**Frontend Idempotency:**
- On load: Fetch event logs from `GET /api/events` and populate `processedIds` Set
- On WebSocket message: Check if `msg.data.id` exists in `processedIds`; if yes, discard entire update
- On valid message: Add `id` to `processedIds` before processing

### Key Entities

- **AgentContainer**: Represents authorized agents with fingerprint, unique name, state, and expiry
- **Authorization**: Grants for specific realms (repositories, APIs) with read/write permissions
- **AuthorizationRequest**: Pending authorization requests awaiting admin approval
- **GrantAPI**: Configured API integrations (GitHub, etc.) with secrets
- **NotificationAPI**: Notification webhook configurations (Discord, etc.)

### API Endpoints (Admin)

- `GET/DELETE /api/agents`
- `GET/POST/PUT/DELETE /api/grants`
- `GET/POST/PUT/DELETE /api/notifications`
- `GET /api/requests/pending`, `POST /api/requests/:id/approve|deny`
- `GET/PATCH /api/authorizations`
- `GET /api/events` - Event logs from Redis stream
- `GET /api/events/stats` - Event log count

### Frontend Features

- Dashboard with system status overview
- Pending request management (approve/deny)
- Agent container management
- Grant API CRUD
- Notification API management with active/paused toggle
- Real-time updates via WebSocket (incremental state updates with idempotent message handling)
- Event log display (live feed from Redis stream)
- Dark/light theme toggle

### No CLAUDE.md or Project-Specific Rules

The project does not contain any custom agent instructions or rules files (`CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, etc.).
