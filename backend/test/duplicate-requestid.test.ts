import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import WebSocket from 'ws';

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

describe('Duplicate RequestId Bug Test', () => {
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

  it('single request-access call should create exactly one pending request', async () => {
    // Create a grant type and grant first
    const grantApiName = `dup-test-grant-${Date.now()}`;
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
        name: grantApiName
      })
      .expect(201);

    // Register an agent
    const { publicKey, privateKey } = generateKeyPair();
    const fingerprint = getFingerprint(publicKey);
    
    await request(`http://localhost:${AGENT_PORT}`)
      .post('/api/register')
      .send({
        uniqueName: `dup-test-agent-${Date.now()}`,
        publicKey
      })
      .expect(201);

    // Get initial pending count
    const initialPendingRes = await request(`http://localhost:${ADMIN_PORT}`)
      .get('/api/requests/pending')
      .expect(200);
    const initialCount = initialPendingRes.body.length;

    // Make a single request-access call
    const timestamp = Date.now();
    const body = {
      serviceAccessKey: 'test-code-key',
      realm: { repository: 'test/repo', read: 1, write: 0 },
      grantApi: grantApiName
    };
    const signature = signData(privateKey, `${timestamp}${JSON.stringify(body)}`);

    const requestRes = await request(`http://localhost:${AGENT_PORT}`)
      .post('/api/request-access')
      .set('x-signature', signature)
      .set('x-timestamp', String(timestamp))
      .set('x-fingerprint', fingerprint)
      .send(body)
      .expect(202);

    const returnedRequestId = requestRes.body.requestId;
    expect(returnedRequestId).toBeDefined();

    // Get pending requests after the call
    const afterPendingRes = await request(`http://localhost:${ADMIN_PORT}`)
      .get('/api/requests/pending')
      .expect(200);
    
    // Should have exactly one more pending request
    expect(afterPendingRes.body.length).toBe(initialCount + 1);

    // Find the request with our returned requestId
    const matchingRequests = afterPendingRes.body.filter((r: any) => r.id === returnedRequestId);
    
    // There should be exactly ONE request with this ID
    expect(matchingRequests.length).toBe(1);

    // Debug: log the full request object
    const createdRequest = matchingRequests[0];
    console.log('Created request:', JSON.stringify(createdRequest, null, 2));
    
    // Verify the authorization was also created
    expect(createdRequest.authorization).toBeDefined();
    expect(createdRequest.authorizationId).toBeDefined();
    expect(createdRequest.authorization?.id).toBeDefined();
    
    // The authorization ID should be different from the request ID
    expect(createdRequest.authorization.id).not.toBe(returnedRequestId);

    // Check all authorizations - there should be exactly ONE for this request
    const authsRes = await request(`http://localhost:${ADMIN_PORT}`)
      .get('/api/authorizations')
      .expect(200);
    
    const matchingAuths = authsRes.body.filter((a: any) => a.id === createdRequest.authorization.id);
    expect(matchingAuths.length).toBe(1);
  });
});
