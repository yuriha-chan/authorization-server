# Scope Agreement: Grant API Type Entity

## 1. Dialogue Synthesis

The request introduces a **GrantApiType** entity to enable user-defined grant API types beyond the current hardcoded 'github' type:

- **New Entity**: Create `GrantApiType` with fields {id, name, grantCode, revokeCode, getStatusCode} where `name` is unique and identifies the type
- **Relationship**: Replace `GrantAPI.type` string field with a reference to `GrantApiType.name` (foreign key relationship)
- **Operations**: Full CRUD operations for GrantApiType entity
- **Testing**: E2E tests must verify that `grantCode`, `revokeCode`, `getStatusCode` are **executed** (called with proper arguments including secrets, account, realm, etc.) when a Grant API of a user-defined type is invoked

## 2. Prove with Quotes

> "currently we have 'github' type for grant API. I want to add user-defined types" (Standpoint 1 clarification)
>
> "yes, type refers to GrantApiType.typename" (Standpoint 2 clarification)
>
> "CRUD" (Standpoint 3 clarification)
>
> "E2E test confirms that grantCode, ... are actually called when user-defined type Grant API is called" (Standpoint 4 clarification)
>
> "GrantAPI.type -> GrantApiType.name, replace, should be unique" (Standpoint 5 clarification)
>
> "not 'executable', confirm 'executed'" (Test clarification)
>
> "Frontend changes: Grant API type should be Chakra UI v3 select element. There should be a new Grant API Types tab for listing and create new types and /grantapis/:type page to provide details and access error log." (Frontend requirements)

## 3. Ubiquitous Language

- **GrantApiType**: A user-defined template for grant API operations containing executable code strings for grant, revoke, and status check operations
- **GrantAPI.type**: References GrantApiType.name (foreign key relationship replacing the previous free-form string)
- **Operation Codes**: The grantCode, revokeCode, and getStatusCode fields containing logic that gets executed during authorization lifecycle. The code is JavaScript.

## 4. Implementation Scope

### Backend Changes
1. **Entity**: `backend/src/entities/GrantApiType.ts` - NEW: TypeORM entity with fields {id, name, grantCode, revokeCode, getStatusCode}
2. **Entity Update**: `backend/src/entities/GrantAPI.ts` - MODIFY: Change `type` field from string to reference GrantApiType.name
3. **Schema**: `backend/src/schemas.ts` - ADD: Zod schema for GrantApiType validation
4. **Routes**: `backend/src/admin/routes/grant-types.ts` - NEW: CRUD routes for GrantApiType
5. **Routes Update**: `backend/src/admin/routes/grants.ts` - MODIFY: Update to use new type relationship
6. **Server**: `backend/src/admin/server.ts` - MODIFY: Register new grant-types routes
7. **Migration**: NEW migration to:
   - Create grant_api_types table
   - Migrate existing 'github' type to GrantApiType record
   - Update grant_apis table to reference grant_api_types.name
8. **Data Source**: `backend/src/db/data-source.ts` - ADD: Register GrantApiType entity

### Frontend Changes
1. **API Client**: `frontend/src/api.js` - ADD: API functions for GrantApiType CRUD operations
2. **Main App**: `frontend/src/App.jsx` - ADD: New "Grant API Types" tab in navigation
3. **Type Selection**: Update Grant API forms to use Chakra UI v3 Select element for choosing GrantApiType
4. **NEW Component**: GrantApiType list view component for the tab
5. **NEW Component**: GrantApiType create/edit form component
6. **NEW Route/Page**: `/grantapis/:type` detail page showing:
   - Type details (name, codes)
   - Error log access

### Testing Changes
1. **E2E Tests**: `backend/test/e2e.test.ts` - ADD:
   - CRUD tests for GrantApiType endpoints
   - Tests confirming grantCode/revokeCode/getStatusCode are **executed** (called with proper arguments) when a Grant API of user-defined type is used

## 5. Validation

Does this agreement accurately reflect the vision?
- GrantApiType as a new entity with unique name identifier ✓
- GrantAPI.type becomes a foreign key reference to GrantApiType.name ✓
- Full CRUD operations for GrantApiType ✓
- E2E tests verify operation codes are actually executed (not just valid) ✓
- Frontend uses Chakra UI v3 Select for type selection ✓
- New "Grant API Types" tab with listing and creation ✓
- Detail page at `/grantapis/:type` with error log access ✓

**Please confirm**: Does this accurately reflect your vision and the boundaries we discussed, or did I miss a critical nuance?
