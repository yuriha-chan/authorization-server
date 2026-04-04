import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';

const PROJECT_ROOT = path.join(__dirname, '..');
const AGENT_PORT = 9080;
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

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
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
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `test-agent-${Date.now()}`,
          publicKey: 'test-public-key',
          fingerprint: `fp-${Date.now()}`
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.state).toBe('active');
    });

    it('POST /api/register fails with duplicate name', async () => {
      const name = `duplicate-agent-${Date.now()}`;
      
      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: name,
          publicKey: 'test-key-1',
          fingerprint: `fp1-${Date.now()}`
        })
        .expect(201);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: name,
          publicKey: 'test-key-2',
          fingerprint: `fp2-${Date.now()}`
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
        const res = await request(`http://localhost:${AGENT_PORT}`)
          .post('/api/register')
          .send({
            uniqueName: `multi-agent-${i}-${Date.now()}`,
            publicKey: `public-key-${i}`,
            fingerprint: `fp-multi-${i}-${Date.now()}`
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
    it('POST /api/request-access without signature returns 401', async () => {
      const res = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/request-access')
        .send({
          codeAccessPublicKey: 'test-code-key',
          realm: {
            repository: 'test/repo',
            read: 1,
            write: 0,
            baseUrl: 'https://api.github.com'
          },
          type: 'github'
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
          codeAccessPublicKey: 'test-code-key',
          realm: {
            repository: 'test/repo',
            read: 1,
            write: 0,
            baseUrl: 'https://api.github.com'
          },
          type: 'github'
        })
        .expect(401);
    });

    it('POST /api/request-access with valid signature returns 202', async () => {
      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = `fp-req-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        codeAccessPublicKey: 'test-code-key',
        realm: {
          repository: 'test/repo',
          read: 1,
          write: 0,
          baseUrl: 'https://api.github.com'
        },
        type: 'github'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `req-agent-${Date.now()}`,
          publicKey,
          fingerprint
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

    it('POST /api/requests/:id/approve approves request', async () => {
      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = `fp-approve-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        codeAccessPublicKey: 'approve-key',
        realm: {
          repository: 'approve/repo',
          read: 1,
          write: 0,
          baseUrl: 'https://api.github.com'
        },
        type: 'github'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `approve-agent-${Date.now()}`,
          publicKey,
          fingerprint
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
      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = `fp-deny-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        codeAccessPublicKey: 'deny-key',
        realm: {
          repository: 'deny/repo',
          read: 1,
          write: 0,
          baseUrl: 'https://api.github.com'
        },
        type: 'github'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: `deny-agent-${Date.now()}`,
          publicKey,
          fingerprint
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
      const ws = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('admin receives request_approved notification via WebSocket', async () => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`);
      
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

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = `fp-ws-test-${Date.now()}`;
      const agentName = `ws-test-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        codeAccessPublicKey: 'code-access-key-ws',
        realm: { repository: 'test/ws-repo', read: 1, write: 0, baseUrl: 'https://api.github.com' },
        type: 'github'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey, fingerprint })
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
      
      const ws1 = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`);
      const ws2 = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`);

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

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = `fp-multi-ws-${Date.now()}`;
      const agentName = `multi-ws-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        codeAccessPublicKey: 'code-access-key-multi',
        realm: { repository: 'test/multi-ws', read: 1, write: 0, baseUrl: 'https://api.github.com' },
        type: 'github'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey, fingerprint })
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
      const ws = new WebSocket(`ws://localhost:${ADMIN_PORT}/api/admin/ws`);

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

      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = `fp-ws-deny-${Date.now()}`;
      const agentName = `ws-deny-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        codeAccessPublicKey: 'code-access-key-deny',
        realm: { repository: 'test/ws-deny', read: 1, write: 0, baseUrl: 'https://api.github.com' },
        type: 'github'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({ uniqueName: agentName, publicKey, fingerprint })
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
      const agentName = `flow-agent-${Date.now()}`;
      const fingerprint = `fp-flow-${Date.now()}`;

      const registerRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: agentName,
          publicKey: 'test-public-key-flow',
          fingerprint
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
      const { publicKey, privateKey } = generateKeyPair();
      const fingerprint = `fp-full-${Date.now()}`;
      const agentName = `full-flow-${Date.now()}`;
      const timestamp = Date.now();
      const body = {
        codeAccessPublicKey: 'code-access-key-full',
        realm: {
          repository: 'full/flow',
          read: 1,
          write: 1,
          baseUrl: 'https://api.github.com'
        },
        type: 'github'
      };
      const bodyString = JSON.stringify(body);
      const signature = signData(privateKey, `${timestamp}${bodyString}`);

      const registerRes = await request(`http://localhost:${AGENT_PORT}`)
        .post('/api/register')
        .send({
          uniqueName: agentName,
          publicKey,
          fingerprint
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
});
