import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';

const PROJECT_ROOT = path.join(__dirname, '..');
const AGENT_PORT = 9080;
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

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
}

function getFingerprint(publicKey: string): string {
  return crypto.createHash('sha256').update(publicKey).digest('hex');
}

function signData(privateKey: string, data: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

describe('E2E Tests', () => {
  beforeAll(async () => {
    process.env.AGENT_PORT = String(AGENT_PORT);
    process.env.ADMIN_PORT = String(ADMIN_PORT);
    process.env.ADMIN_API_KEY = ADMIN_API_KEY;
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    process.env.DB_PATH = path.join(PROJECT_ROOT, 'data/auth.db');
    
    if (!fs.existsSync(path.join(PROJECT_ROOT, 'data'))) {
      fs.mkdirSync(path.join(PROJECT_ROOT, 'data'));
    }

    console.log('Running migrations...');
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
  });

  describe('Agent API', () => {
    it('GET /api/status returns ok', async () => {
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/status')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.role).toBe('agent');
    });

    it('POST /api/register creates new agent', async () => {
      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `test-agent-${Date.now()}`,
          publicKey
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.state).toBe('active');
    });

    it('POST /api/register fails with duplicate name', async () => {
      const name = `duplicate-agent-${Date.now()}`;
      const { publicKey: pk1 } = generateKeyPair();
      const { publicKey: pk2 } = generateKeyPair();
      
      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: name,
          publicKey: pk1
        })
        .expect(201);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: name,
          publicKey: pk2
        })
        .expect(409);
    });

    it('GET /api/openapi.json returns valid OpenAPI spec', async () => {
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .get('/api/openapi.json')
        .expect(200);

      expect(res.body.openapi).toBeDefined();
      expect(res.body.paths).toBeDefined();
    });
  });

  describe('Multiple Agents', () => {
    it('can register multiple agents', async () => {
      const agents: any[] = [];
      for (let i = 0; i < 3; i++) {
        const { publicKey } = generateKeyPair();
        const res = await request(`http://localhost:${AGENT_PORT}`)
          .post('/api/register')
          .send({
            uniqueName: `multi-agent-${i}-${Date.now()}`,
            publicKey
          })
          .expect(201);
        agents.push(res.body);
      }

      expect(agents.length).toBe(3);
      expect(new Set(agents.map((a: any) => a.id)).size).toBe(3);
    });

    it('retrieves all agents via admin', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/agents')
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('Request Access Flow', () => {
    it('POST /api/request-access accepts new format with realm object containing repository, read, and write', async () => {
      // First, create a GrantAPI that we'll reference
      const grantApiName = `test-grant-new-format-${Date.now()}`;
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: grantApiName,
          description: 'Test grant for new format'
        })
        .expect(201);

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'test-new-format-key',
        realm: {
          repository: 'test/repo',
          read: 1,
          write: 0
        },
        grantApi: grantApiName
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `new-format-agent-${Date.now()}`,
          publicKey
        })
        .expect(201);

      const res = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      expect(res.body.requestId).toBeDefined();
      expect(res.body.state).toBe('pending');
    });

    it('POST /api/request-access without signature returns 401', async () => {
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .send({
          serviceAccessKey: 'test-code-key',
          realm: {
            repository: 'test/repo',
            read: 1,
            write: 0
          },
          grantApi: 'test-grant-request-access'
        })
        .expect(401);

      expect(res.body.error).toContain('Missing');
    });

    it('POST /api/request-access with invalid signature returns 401', async () => {
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', 'invalid-signature')
        .set('x-timestamp', String(Date.now()))
        .set('x-fingerprint', `fp-${Date.now()}`)
        .send({
          serviceAccessKey: 'test-code-key',
          realm: {
            repository: 'test/repo',
            read: 1,
            write: 0
          },
          grantApi: 'test-grant-request-access'
        })
        .expect(401);
    });

    it('POST /api/request-access with valid signature returns 202', async () => {
      // Create grant type and grant first
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: 'github',
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .catch(() => { /* grant type may already exist */ });

      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: 'test-grant-request-access'
        })
        .catch(() => { /* grant may already exist */ });

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'test-code-key',
        realm: {
          repository: 'test/repo',
          read: 1,
          write: 0
        },
        grantApi: 'test-grant-request-access'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `req-agent-${Date.now()}`,
          publicKey
        })
        .expect(201);

      const res = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      expect(res.body.requestId).toBeDefined();
      expect(res.body.state).toBe('pending');
    });
  });

  describe('Admin API', () => {
    it('GET /api/status returns ok', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/status')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.role).toBe('admin');
    });

    it('GET /api/agents returns agents', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/agents')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/grants returns grants', async () => {
      const createRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: 'test-grant'
        })
        .expect(201);

      expect(createRes.body.id).toBeDefined();

      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/grants')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some((g: any) => g.id === createRes.body.id)).toBe(true);
    });

    it('GET /api/grants excludes deleted grants', async () => {
      const createRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret-delete',
          account: 'test-account-delete',
          name: 'test-grant-to-delete'
        })
        .expect(201);

      const grantId = createRes.body.id;

      await request(`http://localhost:${ADMIN_PORT}`)
        .delete(`/api/grants/${grantId}`)
        .expect(200);

      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/grants')
        .expect(200);

      expect(res.body.some((g: any) => g.id === grantId)).toBe(false);
    });

    it('POST /api/requests/:id/approve approves request', async () => {
      // Create grant type and grant first
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: 'github',
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .catch(() => { /* grant type may already exist */ });

      const grantRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `approve-grant-${Date.now()}`
        })
        .expect(201);
      const grantName = grantRes.body.name;

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'approve-key',
        realm: {
          repository: 'approve/repo',
          read: 1,
          write: 0
        },
        grantApi: grantName
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `approve-agent-${Date.now()}`,
          publicKey
        })
        .expect(201);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const requestId = requestRes.body.requestId;

      const approveRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${requestId}/approve`)
        .send({ revokeTime: 3600000 })
        .expect(200);

      expect(approveRes.body.message).toContain('approved');
    });

    it('POST /api/requests/:id/deny denies request', async () => {
      // Create grant type and grant first
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: 'github',
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .catch(() => { /* grant type may already exist */ });

      const grantRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `deny-grant-${Date.now()}`
        })
        .expect(201);
      const grantName = grantRes.body.name;

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'deny-key',
        realm: {
          repository: 'deny/repo',
          read: 1,
          write: 0
        },
        grantApi: grantName
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `deny-agent-${Date.now()}`,
          publicKey
        })
        .expect(201);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const requestId = requestRes.body.requestId;

      const denyRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${requestId}/deny`)
        .send({ reason: 'Test denial' })
        .expect(200);

      expect(denyRes.body.message).toContain('denied');
    });

    it('GET /api/websocket/stats returns stats', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/websocket/stats')
        .expect(200);

      expect(res.body.totalClients).toBeDefined();
    });
  });

  describe('WebSocket', () => {
    it('WebSocket server is running on admin port', async () => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`, {
        headers: { 'Cookie': `admin_token=${ADMIN_API_KEY}` }
      });
      
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('WebSocket rejects invalid cookie token', async () => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`, {
        headers: { 'Cookie': 'admin_token=invalid-key' }
      });
      
      let errorReceived = false;
      let errorMessage = '';
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => reject(new Error('Should not connect with invalid token')));
        ws.on('error', (err: Error) => {
          errorReceived = true;
          errorMessage = err.message;
          resolve(undefined);
        });
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(errorReceived).toBe(true);
      expect(errorMessage).toContain('401');
    });

    it('admin receives request_approved notification via WebSocket', async () => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`, {
        headers: { 'Cookie': `admin_token=${ADMIN_API_KEY}` }
      });
      
      const handshake =  new Promise<void>((resolve) => {
        ws.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'connected') resolve();
        });
      });

      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      await handshake;


      ws.send(JSON.stringify({ type: 'subscribe_requests' }));

      // Create grant type and grant first
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: 'github',
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .catch(() => { /* grant type may already exist */ });

      const grantRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `ws-grant-${Date.now()}`
        })
        .expect(201);
      const grantName = grantRes.body.name;

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const agentName = `ws-test-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'code-access-key-ws',
        realm: { repository: 'test/ws-repo', read: 1, write: 0 },
        grantApi: grantName
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey })
        .expect(201);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const requestId = requestRes.body.requestId;

      let approvalReceived = false;
      const approvalPromise = new Promise((resolve) => {
        ws.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'request_approved' && msg.data.requestId === requestId) {
            approvalReceived = true;
            resolve(true);
          }
        });
      });

      await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${requestId}/approve`)
        .send({ revokeTime: 3600000 })
        .expect(200);

      await Promise.race([
        approvalPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      expect(approvalReceived).toBe(true);
      ws.close();
    });

    it('multiple admin clients receive independent messages', async () => {
      const WebSocket = require('ws');
      
      const ws1 = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`, {
        headers: { 'Cookie': `admin_token=${ADMIN_API_KEY}` }
      });
      const ws2 = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`, {
        headers: { 'Cookie': `admin_token=${ADMIN_API_KEY}` }
      });

      const handshake = Promise.all([
        new Promise((resolve) => ws1.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'connected') resolve();
        })),
        new Promise((resolve) => ws2.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'connected') resolve();
        }))
      ]);

      await Promise.all([
        new Promise((resolve) => ws1.on('open', resolve)),
        new Promise((resolve) => ws2.on('open', resolve))
      ]);

      await handshake;

      ws1.send(JSON.stringify({ type: 'subscribe_requests' }));
      ws2.send(JSON.stringify({ type: 'subscribe_requests' }));

      // Create grant type and grant first
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: 'github',
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .catch(() => { /* grant type may already exist */ });

      const grantRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `multi-ws-grant-${Date.now()}`
        })
        .expect(201);
      const grantName = grantRes.body.name;

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const agentName = `multi-ws-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'code-access-key-multi',
        realm: { repository: 'test/multi-ws', read: 1, write: 0 },
        grantApi: grantName
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey })
        .expect(201);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const requestId = requestRes.body.requestId;

      let ws1Received = false;
      let ws2Received = false;

      const ws1Promise = new Promise((resolve) => {
        ws1.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'request_approved' && msg.data.requestId === requestId) {
            ws1Received = true;
            resolve(true);
          }
        });
      });

      const ws2Promise = new Promise((resolve) => {
        ws2.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'request_approved' && msg.data.requestId === requestId) {
            ws2Received = true;
            resolve(true);
          }
        });
      });

      await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${requestId}/approve`)
        .send({ revokeTime: 3600000 })
        .expect(200);

      await Promise.all([
        Promise.race([ws1Promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))]),
        Promise.race([ws2Promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))])
      ]);

      expect(ws1Received).toBe(true);
      expect(ws2Received).toBe(true);

      ws1.close();
      ws2.close();
    });

    it('admin receives request_denied notification via WebSocket', async () => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`, {
        headers: { 'Cookie': `admin_token=${ADMIN_API_KEY}` }
      });

      const handshake = new Promise<void>((resolve) => {
        ws.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'connected') resolve();
        });
      });

      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      await handshake;

      ws.send(JSON.stringify({ type: 'subscribe_requests' }));

      // Create grant type and grant first
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: 'github',
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .catch(() => { /* grant type may already exist */ });

      const grantRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `ws-deny-grant-${Date.now()}`
        })
        .expect(201);
      const grantName = grantRes.body.name;

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const agentName = `ws-deny-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'code-access-key-deny',
        realm: { repository: 'test/ws-deny', read: 1, write: 0 },
        grantApi: grantName
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey })
        .expect(201);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const requestId = requestRes.body.requestId;

      let deniedReceived = false;
      const deniedPromise = new Promise((resolve) => {
        ws.on('message', (data: any) => {
          const msg = JSON.parse(data);
          if (msg.type === 'request_denied' && msg.data.requestId === requestId) {
            deniedReceived = true;
            resolve(true);
          }
        });
      });

      await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${requestId}/deny`)
        .send({ reason: 'Test denial' })
        .expect(200);

      await Promise.race([
        deniedPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      expect(deniedReceived).toBe(true);
      ws.close();
    });
  });

  describe('Full Flow', () => {
    it('registers agent and retrieves it via admin', async () => {
      const { publicKey, privateKey } = generateKeyPair();
      const agentName = `flow-agent-${Date.now()}`;
      const fingerprint = getFingerprint(publicKey);

      const registerRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: agentName,
          publicKey
        })
        .expect(201);

      const agentId = registerRes.body.id;

      const agentsRes = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/agents')
        .expect(200);

      const agent = agentsRes.body.find((a: any) => a.id === agentId);
      expect(agent).toBeDefined();
      expect(agent.uniqueName).toBe(agentName);
    });

    it('full flow: register agent -> request access -> approve -> verify', async () => {
      // Create grant type and grant first
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: 'github',
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .catch(() => { /* grant type may already exist */ });

      const grantRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account',
          name: `full-flow-grant-${Date.now()}`
        })
        .expect(201);
      const grantName = grantRes.body.name;

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const agentName = `full-flow-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'code-access-key-full',
        realm: {
          repository: 'full/flow',
          read: 1,
          write: 1
        },
        grantApi: grantName
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      const registerRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: agentName,
          publicKey
        })
        .expect(201);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const requestId = requestRes.body.requestId;
      expect(requestRes.body.state).toBe('pending');

      const approveRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${requestId}/approve`)
        .send({ revokeTime: 3600000 })
        .expect(200);

      expect(approveRes.body.message).toContain('approved');
    });
  });

  describe('GrantApiType Operation Code Execution', () => {
    it('should execute grantCode when approving authorization with custom type', async () => {
      const typeName = `exec-test-type-${Date.now()}`;
      const expectedToken = `executed-token-${Date.now()}`;
      
      // Create a custom type with grantCode that returns identifiable data
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: `
            async function grant(secrets, account, realm) {
              return { 
                token: '${expectedToken}',
                executed: true,
                account: account,
                repository: realm.repository,
                secretToken: secrets.token
              };
            }
          `,
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .expect(201);

      // Create a grant with the custom type and secrets
      const grantName = `exec-test-grant-${Date.now()}`;
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: typeName,
          baseURL: 'https://api.custom.com',
          secret: JSON.stringify({ token: 'test-secret-value' }),
          account: 'test-account',
          name: grantName
        })
        .expect(201);

      // Register agent
      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const agentName = `exec-agent-${Date.now()}`;
      
      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey })
        .expect(201);

      // Request access with custom type
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'test-code-key',
        realm: { repository: 'test/repo', read: 1, write: 0 },
        grantApi: grantName
      };
      const signature = signData(privateKey, `${timestamp}${JSON.stringify(body)}`);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const pendingRequestId = requestRes.body.requestId;
      expect(requestRes.body.state).toBe('pending');

      // Approve the request - this should execute the grantCode
      const approveRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${pendingRequestId}/approve`)
        .send({ revokeTime: 3600000 })
        .expect(200);

      // Verify the grant code was executed
      expect(approveRes.body.grantResult).toBeDefined();
      expect(approveRes.body.grantResult.executed).toBe(true);
      expect(approveRes.body.grantResult.token).toBe(expectedToken);
    });

    it('should fail to approve when no grant exists for type', async () => {
      const typeName = `no-grant-type-${Date.now()}`;
      
      // Create custom type but NO grant
      await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grant-types')
        .send({
          name: typeName,
          grantCode: 'async function grant() { return { token: "test" }; }',
          revokeCode: 'async function revoke() { return { revoked: true }; }',
          getStatusCode: 'async function getStatus() { return { active: true }; }'
        })
        .expect(201);

      // Register agent
      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = getFingerprint(publicKey);
      const agentName = `no-grant-agent-${Date.now()}`;
      
      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey })
        .expect(201);

      // Request access with custom type (no grant exists)
      const timestamp = Date.now();
      const body = {
        serviceAccessKey: 'test-code-key',
        realm: { repository: 'test/repo', read: 1, write: 0 },
        grantApi: 'non-existent-grant-' + Date.now()
      };
      const signature = signData(privateKey, `${timestamp}${JSON.stringify(body)}`);

      const requestRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .set('x-signature', signature)
        .set('x-timestamp', String(timestamp))
        .set('x-fingerprint', fingerprint)
        .send(body)
        .expect(202);

      const pendingRequestId = requestRes.body.requestId;

      // Approve should fail because no grant exists
      const approveRes = await request(`http://localhost:${ADMIN_PORT}`)
        .post(`/api/requests/${pendingRequestId}/approve`)
        .send({ revokeTime: 3600000 })
        .expect(400);

      expect(approveRes.body.error).toContain('No active Grant API found');
    });

    it('should validate that GrantAPI type references valid GrantApiType', async () => {
      const invalidTypeName = `non-existent-type-${Date.now()}`;
      
      // Attempt to create grant with non-existent type
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          type: invalidTypeName,
          baseURL: 'https://api.test.com',
          secret: 'test',
          account: 'test',
          name: 'invalid-type-grant'
        })
        .expect(400);

      expect(res.body.error).toContain('does not exist');
    });
  });
});
