import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const PROJECT_ROOT = path.join(__dirname, '..');
const ADMIN_PORT = 9081;

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

describe('GrantAPI Type Relationship', () => {
  beforeAll(async () => {
    process.env.ADMIN_PORT = String(ADMIN_PORT);
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    process.env.DB_PATH = path.join(PROJECT_ROOT, 'data/auth.db');

    console.log('Running migrations for relationship tests...');
    await execAsync('pnpm migration:run', PROJECT_ROOT);
    console.log('Migrations complete');

    serverProcess = spawn('node', [path.join(PROJECT_ROOT, 'scripts/test-server.js')], {
      env: { ...process.env, ADMIN_PORT: String(ADMIN_PORT), NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT,
    });

    serverProcess.stdout?.on('data', (data: any) => console.log(`[Server] ${data}`));
    serverProcess.stderr?.on('data', (data: any) => console.error(`[Server Error] ${data}`));

    await new Promise((r) => setTimeout(r, 3000));

    const adminReady = await waitForServer(ADMIN_PORT);
    if (!adminReady) {
      throw new Error('Admin server failed to start');
    }
    console.log('Admin server started');
  }, 60000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      setTimeout(() => serverProcess?.kill('SIGKILL'), 1000);
    }
  });

  describe('GrantAPI creation with type relationship', () => {
    it('should create grant with existing type', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: 'test-grant-github'
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBeDefined();
      expect(res.body.type.name).toBe('github');
    });

    it('should return 400 for non-existent type', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'non-existent-type-12345',
          baseURL: 'https://api.example.com',
          secret: 'test-secret',
          account: 'test-account',
          name: 'test-grant-invalid'
        })
        .expect(400);

      expect(res.body.error).toContain('does not exist');
    });

    it('should create grant with custom type', async () => {
      // First create a custom type
      const typeName = `custom-type-${Date.now()}`;
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return {}; }',
          revokeCode: 'async function revoke() { return {}; }',
          getStatusCode: 'async function getStatus() { return {}; }'
        })
        .expect(201);

      // Then create a grant with that type
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://api.custom.com',
          secret: 'test-secret',
          account: 'test-account',
          name: 'test-grant-custom'
        })
        .expect(201);

      expect(res.body.type.name).toBe(typeName);
    });
  });

  describe('GrantAPI update with type relationship', () => {
    it('should update grant type', async () => {
      // Create a grant first
      const createRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: 'test-grant-update'
        })
        .expect(201);

      const grantId = createRes.body.id;

      // Create another type to update to
      const newTypeName = `another-type-${Date.now()}`;
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: newTypeName,
          grantCode: 'code',
          revokeCode: 'code',
          getStatusCode: 'code'
        })
        .expect(201);

      // Update the grant's type
      const updateRes = await request(`http://localhost:${ADMIN_PORT}`)
        .put(`/api/grants/${grantId}`)
        .send({
          type: newTypeName
        })
        .expect(200);

      expect(updateRes.body.type.name).toBe(newTypeName);
    });
  });

  describe('GrantAPI response includes type details', () => {
    it('should include type details when fetching grants', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/grants')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0].type).toBeDefined();
        expect(res.body[0].type.name).toBeDefined();
        expect(res.body[0].type.grantCode).toBeDefined();
      }
    });
  });
});
