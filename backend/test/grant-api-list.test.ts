import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const PROJECT_ROOT = path.join(__dirname, '..');
const AGENT_PORT = 9090;
const ADMIN_PORT = 9091;
const TEST_DB_PATH = path.join(PROJECT_ROOT, 'data/grant-api-list-test.db');

let serverProcess: ChildProcess | undefined;

function waitForServer(port: number, timeout = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (Date.now() - start > timeout) {
        resolve(false);
        return;
      }
      require('http').get(`http://localhost:${port}/api/status`, (res: any) => {
        resolve(res.statusCode === 200);
      }).on('error', () => {
        setTimeout(check, 500);
      });
    };
    check();
  });
}

function execAsync(cmd: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { cwd, shell: true });
    let output = '';
    child.stdout?.on('data', (d) => output += d);
    child.stderr?.on('data', (d) => output += d);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(output));
    });
    child.on('error', reject);
  });
}

describe('GET /api/grant-apis', () => {
  beforeAll(async () => {
    process.env.AGENT_PORT = String(AGENT_PORT);
    process.env.ADMIN_PORT = String(ADMIN_PORT);
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    process.env.DB_PATH = TEST_DB_PATH;

    // Remove existing test database to start fresh
    const fs = require('fs');
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    console.log('Running migrations for grant-apis tests...');
    await execAsync('pnpm migration:run', PROJECT_ROOT);
    console.log('Migrations complete');

    serverProcess = spawn('node', [path.join(PROJECT_ROOT, 'scripts/test-server.js')], {
      env: { ...process.env, AGENT_PORT: String(AGENT_PORT), ADMIN_PORT: String(ADMIN_PORT), NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT,
    });

    serverProcess.stdout?.on('data', (data: any) => console.log(`[Server] ${data}`));
    serverProcess.stderr?.on('data', (data: any) => console.error(`[Server Error] ${data}`));

    await new Promise((r) => setTimeout(r, 3000));

    const [agentReady, adminReady] = await Promise.all([
      waitForServer(AGENT_PORT),
      waitForServer(ADMIN_PORT),
    ]);

    if (!agentReady || !adminReady) {
      throw new Error('Servers failed to start');
    }
    console.log('Servers started');
  }, 60000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      setTimeout(() => serverProcess?.kill('SIGKILL'), 1000);
    }
    
    // Clean up test database
    const fs = require('fs');
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data before each test
    // Note: We don't delete all grants to avoid breaking other tests that depend on them
  });

  describe('Query parameter validation', () => {
    it('should return 400 when type parameter is missing', async () => {
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .expect(400);

      expect(res.body.error).toContain('type');
    });

    it('should return empty array when type does not exist', async () => {
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: 'non-existent-type-12345' })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe('Filtering by type', () => {
    it('should return GrantAPIs filtered by type', async () => {
      const typeName = `list-test-type-${Date.now()}`;
      
      // Create a grant type
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Create grants with this type
      const grantName1 = `list-grant-1-${Date.now()}`;
      const grantName2 = `list-grant-2-${Date.now()}`;
      
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://api1.example.com',
          secret: 'test-secret-1',
          account: 'test-account-1',
          name: grantName1,
          description: 'First test grant'
        })
        .expect(201);

      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://api2.example.com',
          secret: 'test-secret-2',
          account: 'test-account-2',
          name: grantName2,
          description: 'Second test grant'
        })
        .expect(201);

      // Query the endpoint
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      
      // Verify the response contains our grants
      const names = res.body.map((g: any) => g.name);
      expect(names).toContain(grantName1);
      expect(names).toContain(grantName2);
    });

    it('should return GrantAPIs filtered by type and baseUrl', async () => {
      const typeName = `list-baseurl-type-${Date.now()}`;
      const baseUrl = 'https://specific.example.com';
      
      // Create a grant type
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Create grants with different baseURLs
      const matchingGrantName = `matching-grant-${Date.now()}`;
      const otherGrantName = `other-grant-${Date.now()}`;
      
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: baseUrl,
          secret: 'test-secret',
          account: 'test-account',
          name: matchingGrantName,
          description: 'Matching baseURL grant'
        })
        .expect(201);

      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://other.example.com',
          secret: 'test-secret',
          account: 'test-account',
          name: otherGrantName,
          description: 'Other baseURL grant'
        })
        .expect(201);

      // Query with both type and baseUrl
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName, baseUrl: baseUrl })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe(matchingGrantName);
      expect(res.body[0].baseURL).toBe(baseUrl);
    });
  });

  describe('State filtering', () => {
    it('should only return active GrantAPIs', async () => {
      const typeName = `state-test-type-${Date.now()}`;
      
      // Create a grant type
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Create active grant
      const activeGrantName = `active-grant-${Date.now()}`;
      const activeRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://api.example.com',
          secret: 'test-secret',
          account: 'test-account',
          name: activeGrantName,
          description: 'Active grant',
          state: 'active'
        })
        .expect(201);

      // Create inactive grant by updating state
      const inactiveGrantName = `inactive-grant-${Date.now()}`;
      const inactiveRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://api.example.com',
          secret: 'test-secret',
          account: 'test-account',
          name: inactiveGrantName,
          description: 'Inactive grant',
          state: 'active'
        })
        .expect(201);

      // Update to inactive
      await request(`http://localhost:${ADMIN_PORT}`)
        .put(`/api/grants/${inactiveRes.body.id}`)
        .send({ state: 'inactive' })
        .expect(200);

      // Query the endpoint
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      
      // Should only contain the active grant
      const names = res.body.map((g: any) => g.name);
      expect(names).toContain(activeGrantName);
      expect(names).not.toContain(inactiveGrantName);
    });
  });

  describe('Response format', () => {
    it('should return GrantAPIs with correct format', async () => {
      const typeName = `format-test-type-${Date.now()}`;
      const baseUrl = 'https://format.example.com';
      const description = 'Test description for format validation';
      
      // Create a grant type
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Create a grant
      const grantName = `format-grant-${Date.now()}`;
      const createRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: baseUrl,
          secret: 'test-secret',
          account: 'test-account',
          name: grantName,
          description: description
        })
        .expect(201);

      // Query the endpoint
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const grant = res.body[0];
      expect(grant.id).toBe(createRes.body.id);
      expect(grant.name).toBe(grantName);
      expect(grant.type).toBe(typeName);
      expect(grant.baseURL).toBe(baseUrl);
      expect(grant.description).toBe(description);
    });

    it('should handle grants without description', async () => {
      const typeName = `no-desc-type-${Date.now()}`;
      
      // Create a grant type
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Create a grant without description
      const grantName = `no-desc-grant-${Date.now()}`;
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://api.example.com',
          secret: 'test-secret',
          account: 'test-account',
          name: grantName
        })
        .expect(201);

      // Query the endpoint
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const grant = res.body[0];
      expect(grant.id).toBeDefined();
      expect(grant.name).toBe(grantName);
      expect(grant.type).toBe(typeName);
      expect(grant.baseURL).toBe('https://api.example.com');
      expect(grant.description).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should return empty array when no grants match the filters', async () => {
      const typeName = `empty-test-type-${Date.now()}`;
      
      // Create a grant type
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Query with a non-matching baseUrl
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName, baseUrl: 'https://non-matching.example.com' })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should handle multiple types independently', async () => {
      const typeName1 = `multi-type-1-${Date.now()}`;
      const typeName2 = `multi-type-2-${Date.now()}`;
      
      // Create grant types
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName1,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName2,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Create grants for each type
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName1,
          baseURL: 'https://api1.example.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `grant-type1-${Date.now()}`
        })
        .expect(201);

      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName2,
          baseURL: 'https://api2.example.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `grant-type2-${Date.now()}`
        })
        .expect(201);

      // Query for type 1
      const res1 = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName1 })
        .expect(200);

      expect(Array.isArray(res1.body)).toBe(true);
      expect(res1.body.length).toBe(1);
      expect(res1.body[0].type).toBe(typeName1);

      // Query for type 2
      const res2 = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/grant-apis')
        .query({ type: typeName2 })
        .expect(200);

      expect(Array.isArray(res2.body)).toBe(true);
      expect(res2.body.length).toBe(1);
      expect(res2.body[0].type).toBe(typeName2);
    });
  });
});
