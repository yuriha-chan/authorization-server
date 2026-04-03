import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

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

  describe('Admin API', () => {
    it('GET /api/status returns ok', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/status')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.role).toBe('admin');
    });

    it('GET /api/agents returns list', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/agents')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/grants returns list', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/grants')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/grants creates new grant', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .post('/api/grants')
        .send({
          name: `test-grant-${Date.now()}`,
          type: 'github',
          baseURL: 'https://api.github.com',
          secret: 'test-secret',
          account: 'test-account'
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBeDefined();
    });

    it('GET /api/openapi.json returns valid OpenAPI spec', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/openapi.json')
        .expect(200);

      expect(res.body.openapi).toBeDefined();
      expect(res.body.paths).toBeDefined();
    });

    it('GET /api/websocket/stats returns stats', async () => {
      const res = await request(`http://localhost:${ADMIN_PORT}`)
        .get('/api/websocket/stats')
        .expect(200);

      expect(res.body.totalClients).toBeDefined();
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
  });
});
