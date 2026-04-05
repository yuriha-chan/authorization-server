# Task Ledger: GrantAPI Refactor

## Phase 1: Database Schema (Foundation)

### Task 1.1: Update GrantAPI Entity ✅
- **RED**: Write test for GrantAPI entity with description field and unique name constraint ✅
- **GREEN**: Update GrantAPI.ts to add description column and enforce name uniqueness ✅
- **REFACTOR**: Review entity structure and relationships (no refactoring needed) ✅

### Task 1.2: Update Authorization Entity ✅
- **RED**: Write test for Authorization entity with grantApi relationship instead of type string ✅
- **GREEN**: Update Authorization.ts to replace type string with grantApi ManyToOne relationship ✅
- **REFACTOR**: Review realm type changes (remove baseUrl) - Added index and documentation ✅

### Task 1.3: Generate Migration ✅
- **RED**: N/A (migration generation) ✅
- **GREEN**: Run migration:generate to create database migration ✅
- **REFACTOR**: Review generated migration ✅

## Phase 2: Validation Schemas (Contracts)

### Task 2.1: Update Request Schema ✅
- **RED**: Write test for updated requestSchema with grantApi and serviceAccessKey fields ✅
- **GREEN**: Update schemas.ts to change requestSchema format ✅
- **REFACTOR**: Review schema validation logic - Added length constraints ✅

### Task 2.2: Update Grant Schema ✅
- **RED**: Write test for grantSchema with optional description field ✅
- **GREEN**: Update schemas.ts to add description to grantSchema ✅
- **REFACTOR**: Review schema structure

## Phase 3: Agent Server (New Endpoint + Modified Handler)

### Task 3.1: Add List GrantAPIs Endpoint
- **RED**: Write test for GET /api/grant-apis endpoint with type and baseUrl query parameters
- **GREEN**: Implement endpoint in agent/server.ts
- **REFACTOR**: Review query logic and response format

### Task 3.2: Update Request Access Endpoint
- **RED**: Write test for updated POST /api/request-access with new format
- **GREEN**: Update request-access handler to accept grantApi name and serviceAccessKey
- **REFACTOR**: Review authorization creation logic

## Phase 4: Admin Routes (Grants + Requests)

### Task 4.1: Update Grants Routes
- **RED**: Write test for grants routes with description field handling
- **GREEN**: Update admin/routes/grants.ts to handle description
- **REFACTOR**: Review response format

### Task 4.2: Update Requests Routes
- **RED**: Write test for approval flow using authorization.grantApi.type.name
- **GREEN**: Update admin/routes/requests.ts approval handler
- **REFACTOR**: Review operation execution logic

## Phase 5: Agent Client Script

### Task 5.1: Add list-grants Command
- **RED**: Write test for list-grants command parsing and API call
- **GREEN**: Implement list-grants command in agent-client.js
- **REFACTOR**: Review argument parsing and output format

### Task 5.2: Update request Command
- **RED**: Write test for updated request command with new argument structure
- **GREEN**: Update request command to accept grantApiName, key, repository[rw]
- **REFACTOR**: Review request body structure

## Phase 6: Tests

### Task 6.1: Update Existing Tests
- **RED**: N/A (update existing tests)
- **GREEN**: Update e2e.test.ts and grant-api-relationship.test.ts for new format
- **REFACTOR**: Review test coverage

### Task 6.2: Add New Tests
- **RED**: Write tests for new list-grants endpoint and updated request-access format
- **GREEN**: Implement tests in appropriate test files
- **REFACTOR**: Review test assertions

## Phase 7: Frontend Types and Display

### Task 7.1: Update Types
- **RED**: Write test for updated Authorization interface
- **GREEN**: Update frontend/src/types.ts to use grantApi object
- **REFACTOR**: Review type definitions

### Task 7.2: Update Components
- **RED**: Write test for component rendering with grantApi data
- **GREEN**: Update PendingPanel.tsx and AuthorizationsPanel.tsx
- **REFACTOR**: Review display logic

## Current Status
- [ ] Phase 1: Database Schema (Foundation)
- [ ] Phase 2: Validation Schemas (Contracts)
- [ ] Phase 3: Agent Server (New Endpoint + Modified Handler)
- [ ] Phase 4: Admin Routes (Grants + Requests)
- [ ] Phase 5: Agent Client Script
- [ ] Phase 6: Tests
- [ ] Phase 7: Frontend Types and Display
