# Implementation Plan: GrantAPI Refactor

## Overview

This plan implements the GrantAPI refactor as specified in `Scope_Agreement_grantapi_refactor.md`. The changes transition the system from using GrantAPI types with embedded baseUrls to referencing specific GrantAPI instances by name, with agents discovering available APIs via a new listing endpoint.

## Key Architectural Changes

### 1. Entity Relationship Change
- **Authorization** entity transitions from storing `type: string` to `grantApi: GrantAPI` (ManyToOne relationship)
- **GrantAPI** entity adds `description: string` (optional) and enforces `name` as unique
- **Realm** structure removes `baseUrl` (now derived from GrantAPI)

### 2. API Contract Changes
- **Agent API** adds `GET /api/grant-apis?type=&baseUrl=` for discovering GrantAPIs
- **Request Access** endpoint changes from accepting `type` + `realm.baseUrl` to accepting `grantApi` (by name) + `key` (service access key)
- **Admin Grants API** returns GrantAPI with eager-loaded type relationship and description

### 3. Agent Client Changes
- New `list-grants <type> [baseURL]` command for discovering APIs
- `request` command changes signature from `<type> <realm-spec>` to `<grantApiName> <key> <repository[rw]>`

## Implementation Order

### Phase 1: Database Schema (Foundation)
**Files**: `backend/src/entities/GrantAPI.ts`, `backend/src/entities/Authorization.ts`

Update entities to reflect new structure:
- GrantAPI: Add description column, ensure name uniqueness
- Authorization: Replace type string with grantApi relationship, update realm type

**Critical**: Run `pnpm migration:generate` after entity changes to create migration.

### Phase 2: Validation Schemas (Contracts)
**File**: `backend/src/schemas.ts`

Update Zod schemas:
- `requestSchema`: Change `type` to `grantApi` (string), rename `codeAccessPublicKey` to `key`, remove baseUrl from realm
- `grantSchema`: Add optional description field

### Phase 3: Agent Server (New Endpoint + Modified Handler)
**File**: `backend/src/agent/server.ts`

1. Add `GET /api/grant-apis` endpoint:
   - Query parameters: `type` (required), `baseUrl` (optional)
   - Returns: Array of {id, name, type, baseURL, description}
   - Filter by state='active'

2. Update `POST /api/request-access`:
   - Accept `grantApi` (name) instead of `type`
   - Accept `key` instead of `codeAccessPublicKey`
   - Look up GrantAPI by name to get type and baseUrl
   - Store grantApi relationship in Authorization
   - realm no longer contains baseUrl

### Phase 4: Admin Routes (Grants + Requests)
**Files**: `backend/src/admin/routes/grants.ts`, `backend/src/admin/routes/requests.ts`

1. **Grants Routes**:
   - POST/PUT: Handle description field in schema validation
   - Return responses include GrantAPI with type relationship

2. **Requests Routes** (Critical Integration Point):
   - Approval flow must use `authorization.grantApi.type.name` instead of `authorization.type`
   - The `findGrantForType` service function needs grantApi.type.name
   - Update event publishing to include grantApi details

### Phase 5: Agent Client Script
**File**: `backend/scripts/agent-client.js`

1. Add `list-grants` command parsing and handler
2. Modify `request` command:
   - New argument structure: grantApiName, key, repository[rw]
   - Remove baseUrl from realm-spec parsing
   - Update request body structure sent to API
3. Update help text and usage examples

### Phase 6: Tests
**Files**: `backend/test/e2e.test.ts`, `backend/test/grant-api-relationship.test.ts`

Update all test cases:
- Change request body format from `{type, codeAccessPublicKey, realm: {baseUrl}}` to `{grantApi, key, realm}`
- Add tests for new list-grants endpoint
- Update assertions to check for grantApi relationship instead of type string
- Update test data to include description field where relevant

### Phase 7: Frontend Types and Display
**Files**: `frontend/src/types.ts`, `frontend/src/components/PendingPanel.tsx`, `frontend/src/components/AuthorizationsPanel.tsx`

1. **Types**: Update Authorization interface to have `grantApi: Grant` instead of `type: string`
2. **PendingPanel**: Update RequestRow to display grantApi.name, grantApi.type, grantApi.baseURL
3. **AuthorizationsPanel**: Update table column from Type to GrantAPI with composite display

## Critical Integration Points

### 1. GrantAPI Name Resolution
When agent sends `grantApi` (name) in request-access:
- Must look up GrantAPI by name to verify it exists and is active
- Must extract `type` from GrantAPI.type relationship for operation execution
- Must extract `baseURL` from GrantAPI for realm composition

### 2. Approval Flow Operation Execution
In `requests.ts` approve handler:
- Current: Uses `auth.type` directly to find grant and execute code
- New: Must use `auth.grantApi.type.name` to find matching GrantApiType
- The operation executor service receives type name from GrantAPI relationship

### 3. Event Publishing
WebSocket and Redis events include authorization data:
- Ensure events publish grantApi details (name, type, baseUrl) not just type string
- Frontend depends on these events for real-time updates

### 4. Agent Client Realm Parsing
Current realm-spec: `repo@baseUrl[rw]`
New realm-spec: `repo[rw]` (baseUrl removed)
- Parser must handle this change
- Must validate repository format without baseUrl

## Testing Strategy

### Unit/Integration Tests
- Test new list-grants endpoint with various query combinations
- Test request-access with new format
- Test approval flow uses correct GrantAPI relationship

### E2E Tests
- Full flow: agent lists grants → selects one → requests access → admin approves
- Verify frontend displays GrantAPI information correctly
- Verify agent receives correct authorization data

### Data Verification
- Verify realm JSON no longer contains baseUrl
- Verify Authorization has grantApi relationship populated
- Verify GrantAPI description field is persisted

## Constraints & Assumptions

1. **No Data Migration**: Pre-production phase, existing data can be discarded
2. **Name Uniqueness**: GrantAPI.name must be unique across all grants
3. **Agent Client Non-Interactive**: No interactive prompts, all data via command arguments
4. **Backward Compatibility**: Intentionally breaking change - old format not supported
5. **Type Safety**: All TypeScript types must be updated to reflect new structure

## Rollback Considerations

If issues arise:
- Database migration would need to be reverted
- Agent clients would need to use old version
- Frontend would need to handle both formats temporarily

## Verification Checklist

- [ ] Agent can list grants by type
- [ ] Agent can request access using grant name
- [ ] Admin can approve and grant code executes with correct type
- [ ] Frontend displays GrantAPI name, type, baseUrl
- [ ] Realm JSON does not contain baseUrl
- [ ] All tests pass
- [ ] Agent client help text updated
