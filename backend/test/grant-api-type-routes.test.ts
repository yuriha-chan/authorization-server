import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { AppDataSource } from '../src/db/data-source';

const PROJECT_ROOT = path.join(__dirname, '..');
const ADMIN_PORT = 9081;
const ADMIN_API_KEY = 'test-admin-api-key';

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

describe('GrantApiType API', () => {
  beforeAll(async () => {
    process.env.ADMIN_PORT = String(ADMIN_PORT);
    process.env.ADMIN_API_KEY = ADMIN_API_KEY;
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    process.env.DB_PATH = path.join(PROJECT_ROOT, 'data/auth.db');

    console.log('Running migrations for GrantApiType tests...');
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

  describe('POST /api/grant-types', () => {
    it('should create a new grant API type', async () => {
      const typeName = `test-type-create-${Date.now()}`;
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant(secrets, account, realm) { return {}; }',
          revokeCode: 'async function revoke(secrets, account, token) { return {}; }',
          getStatusCode: 'async function getStatus(secrets, account, token) { return {}; }'
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(typeName);
      expect(res.body.grantCode).toContain('async function grant');
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: '',
          grantCode: '',
          revokeCode: '',
          getStatusCode: ''
        })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should return 409 for duplicate name', async () => {
      const name = `duplicate-type-${Date.now()}`;
      
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name,
          grantCode: 'code1',
          revokeCode: 'code1',
          getStatusCode: 'code1'
        })
        .expect(201);

      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name,
          grantCode: 'code2',
          revokeCode: 'code2',
          getStatusCode: 'code2'
        })
        .expect(409);

      expect(res.body.error).toContain('already exists');
    });
  });

  describe('GET /api/grant-types', () => {
    it('should return list of grant API types', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/grant-types')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/grant-types/:name', () => {
    it('should return a specific grant API type', async () => {
      const name = `get-type-${Date.now()}`;
      
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name,
          grantCode: 'grant code',
          revokeCode: 'revoke code',
          getStatusCode: 'status code'
        })
        .expect(201);

      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get(`/api/grant-types/${name}`)
        .expect(200);

      expect(res.body.name).toBe(name);
      expect(res.body.grantCode).toBe('grant code');
    });

    it('should return 404 for non-existent type', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/grant-types/non-existent-type-12345')
        .expect(404);

      expect(res.body.error).toContain('not found');
    });
  });

  describe('PUT /api/grant-types/:name', () => {
    it('should update a grant API type', async () => {
      const name = `update-type-${Date.now()}`;
      
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name,
          grantCode: 'original grant',
          revokeCode: 'original revoke',
          getStatusCode: 'original status'
        })
        .expect(201);

      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .put(`/api/grant-types/${name}`)
        .send({
          grantCode: 'updated grant code'
        })
        .expect(200);

      expect(res.body.grantCode).toBe('updated grant code');
      expect(res.body.revokeCode).toBe('original revoke');
    });

    it('should return 404 for non-existent type', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .put('/api/grant-types/non-existent-type-12345')
        .send({ grantCode: 'new code' })
        .expect(404);

      expect(res.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/grant-types/:name', () => {
    it('should delete a grant API type', async () => {
      const name = `delete-type-${Date.now()}`;
      
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name,
          grantCode: 'grant',
          revokeCode: 'revoke',
          getStatusCode: 'status'
        })
        .expect(201);

      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .delete(`/api/grant-types/${name}`)
        .expect(200);

      expect(res.body.message).toContain('deleted');

      await request(`http://localhost:${ADMIN_PORT}`)
        .get(`/api/grant-types/${name}`)
        .expect(404);
    });

    it('should return 404 for non-existent type', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .delete('/api/grant-types/non-existent-type-12345')
        .expect(404);

      expect(res.body.error).toContain('not found');
    });
  });
});
