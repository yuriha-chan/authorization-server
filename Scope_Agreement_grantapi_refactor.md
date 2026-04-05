# Scope Agreement: GrantAPI Refactor

## Dialogue Synthesis

### User Intent
The user wants to refactor the authorization system to:

1. **Change Agent API Request Format**: From `(grant api type, baseurl, realm)` to `(grant api, key, realm)` where:
   - `grant api` is identified by name (not just type)
   - `key` is the `serviceAccessKey` (renamed from `codeAccessPublicKey`) - the public key for SSH authentication or existing token the agent created
   - `realm` no longer contains `baseUrl` (removed)

2. **Add New Agent API**: `list-grants <type> <optional:baseURL>` endpoint that returns name, baseurl, and description of matching GrantAPIs

3. **Add Database Fields**:
   - GrantAPI: add optional `description` text field
   - GrantAPI: `name` is now unique and indexed
   - Authorization: replace `type` string with `grantapi` relationship (ManyToOne to GrantAPI)
   - Remove `baseUrl` from realm JSON in Authorization

4. **Update Agent Client** (`backend/scripts/agent-client.js`):
   - Add `list-grants <type> [baseURL]` command
   - Change `request` command to: `request <grantApiName> <key> <realm>`
   - Rename `codeAccessPublicKey` to `key` (or `serviceAccessKey`)

5. **Frontend Presentation**: Display `grantapi.name`, `grantapi.type`, and `grantapi.baseurl` for rendering authorizations and requests (keep current layout)

### User Quotes
> "`key` means the public key the agent created for github ssh authentication, or any existing token the agent created to access external services, kept in the agent container. `codeAccessPublicKey` should be renamed to `key` or `serviceAccessKey` or something."

> "agent-client is a non-interactive tool. `agent-client list-grants <type> <optional:baseURL>` to obtain the name, baseurl and description of grantApis, and then the agent or the developer in the container use `agent-client request <grantApiName> <key> <realm>`"

> "remove it [baseUrl from realm]"

> "simply just add table (luckyly, this is in a pre-production phase so there is no need for proper migration)"

---

## Ubiquitous Language

| Term | Definition |
|------|------------|
| **serviceAccessKey** | The public key or token that the agent created for accessing external services (renamed from `codeAccessPublicKey`) |
| **grantApiName** | The unique identifier for a GrantAPI instance used in agent-client commands |
| **list-grants** | New agent-client command to discover available GrantAPIs by type and optional baseURL |

---

## Implementation Boundary

### In Scope (Agent Will Modify)

#### Backend Entities (`backend/src/entities/`)
1. **GrantAPI.ts**: Add optional `description: string` column
2. **Authorization.ts**: 
   - Replace `type: string` with `grantApi: GrantAPI` (ManyToOne relationship)
   - Update `realm` type to exclude `baseUrl`

#### Backend Schemas (`backend/src/schemas.ts`)
1. Update `requestSchema` to use `grantApi` (string/name) instead of `type`
2. Remove `baseUrl` from realm schema
3. Rename `codeAccessPublicKey` to `serviceAccessKey`
4. Update `grantSchema` to include optional `description`

#### Backend Routes (`backend/src/`)
1. **Agent Server** (`agent/server.ts`): 
   - Update `/api/request-access` to accept new format
   - Add `/api/grant-apis?type=&baseUrl=` endpoint for listing GrantAPIs
2. **Admin Routes** (`admin/routes/grants.ts`): 
   - Update to handle `description` field
   - Update to return GrantAPI with type relationship
3. **Request Routes** (`admin/routes/requests.ts`): 
   - Update approval flow to use `authorization.grantApi` instead of `authorization.type`

#### Agent Client (`backend/scripts/agent-client.js`)
1. Add `list-grants` command: `agent-client list-grants <type> [baseURL]`
   - Calls new endpoint, displays name, baseurl, description
2. Modify `request` command: `agent-client request <grantApiName> <serviceAccessKey> <realm-spec>`
   - Changed from `<type> <realm-spec>` to `<grantApiName> <serviceAccessKey> <repository[rw]>`
   - Remove baseUrl from realm-spec parsing (only `repository[rw]` format)
3. Update help text and argument parsing

#### Tests (`backend/test/`)
1. Update `e2e.test.ts` to use new API format
2. Update `grant-api-relationship.test.ts` for new entity structure
3. Add tests for new `list-grants` endpoint
4. Update test data to include `description` and use `grantApi` instead of `type`

### Frontend (Will Be Updated)
1. **types.ts**: Update Authorization interface to use `grantApi` object
2. **PendingPanel.tsx**: Update to display `grantapi.name`, `grantapi.type`, `grantapi.baseurl`
3. **AuthorizationsPanel.tsx**: Update Type column to show GrantAPI details

### Out of Scope (Agent Will NOT Modify)
1. Existing data migration (pre-production, no migration needed)
2. GrantApiType entity changes

### Consider
1. Changes in Admin UI forms for creating/editing GrantAPIs 
2. Notification system / WebSocket message format changes (Data syncing, LogItem formatting)

## Validation
Use `serviceAccessKey` or just `key` as the field name?
In the database, should Authorization.grantApi be a foreign key relationship
The frontend should show: `grantapi.name` (as primary label), `grantapi.type` (as badge), `grantapi.baseurl` (as secondary text)
