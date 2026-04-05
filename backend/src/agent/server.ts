// src/agent/server.ts
import Redis from 'ioredis';
import express from 'express';
import { Server as HttpServer } from 'http';
import { AgentWebSocket } from '../websocket/agent';
import crypto from 'crypto';
import { AppDataSource } from '../db/data-source';
import { AgentContainer } from '../entities/AgentContainer';
import { Authorization } from '../entities/Authorization';
import { AuthorizationRequest } from '../entities/AuthorizationRequest';
import { eventBus } from '../events/pubsub';
import { z } from 'zod';
import { registerSchema, requestSchema } from '../schemas';
import fs from 'fs';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

AppDataSource.initialize().catch(err => console.error('DB init failed:', err));

async function checkReplayAttack(reqTime: number, fingerprint: string): Promise<boolean> {
  const key = `reqTime:${fingerprint}:${reqTime}`;
  const exists = await redis.exists(key);
  if (exists) {
    return true;
  }
  await redis.setex(key, 300, '1');
  return false;
}

const app = express();
const port = parseInt(process.env.AGENT_PORT || '8080');

app.use(express.json());

// 署名検証ミドルウェア
async function verifySignature(req: express.Request, res: express.Response, next: express.NextFunction) {
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const fingerprint = req.headers['x-fingerprint'] as string;
  
  if (!signature || !timestamp || !fingerprint) {
    return res.status(401).json({ error: 'Missing signature headers' });
  }
 
  const now = Date.now();
  const reqTime = parseInt(timestamp);
  if (Math.abs(now - reqTime) > 300000) {
    return res.status(401).json({ error: 'Request expired' });
  }

  if (await checkReplayAttack(reqTime, fingerprint)) {
    return res.status(401).json({ error: 'Replay attack detected' });
  }
  
  // Agentの公開鍵を取得
  const agentRepo = AppDataSource.getRepository(AgentContainer);
  const agent = await agentRepo.findOneBy({ fingerprint });
  
  if (!agent || agent.state !== 'active') {
    return res.status(401).json({ error: 'Agent not found or inactive' });
  }
  
  const bodyString = JSON.stringify(req.body);
  const verifier = crypto.createVerify('SHA256');
  verifier.update(`${timestamp}${bodyString}`);
  verifier.end();
  
  const isValid = verifier.verify(agent.publicKey, signature, 'base64');
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  req.agent = agent;
  next();
}

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), role: 'agent' });
});

app.post('/api/register', async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);
    const repo = AppDataSource.getRepository(AgentContainer);
    
    const existing = await repo.findOneBy({ uniqueName: validated.uniqueName });
    if (existing) {
      return res.status(409).json({ error: 'Agent name already exists' });
    }
    
    const fingerprint = crypto.createHash('sha256').update(validated.publicKey).digest('hex');
    
    const agent = repo.create({
      uniqueName: validated.uniqueName,
      fingerprint,
      publicKey: validated.publicKey,
      state: 'active'
    });
    
    await repo.save(agent);
    
    res.status(201).json({
      id: agent.id,
      uniqueName: agent.uniqueName,
      state: agent.state
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Failed to register agent' });
    }
  }
});

app.post('/api/request-access', verifySignature, async (req, res) => {
  try {
    const validated = requestSchema.parse(req.body);
    const agent = req.agent;
    
    // Use transaction to ensure both are created atomically
    const { auth, request } = await AppDataSource.transaction(async (manager) => {
      const authRepo = manager.getRepository(Authorization);
      const requestRepo = manager.getRepository(AuthorizationRequest);

      // Create and save authorization first
      const auth = authRepo.create({
        key: validated.codeAccessPublicKey,
        type: validated.type,
        realm: validated.realm,
        state: 'pending',
        container: agent
      });
      await authRepo.save(auth);

      // Create request with the saved auth (now has an ID)
      const request = requestRepo.create({
        state: 'pending',
        signature: req.headers['x-signature'] as string,
        history: [{ action: 'created', timestamp: new Date() }],
        authorization: { id: auth.id }
      });
      await requestRepo.save(request);

      return { auth, request };
    });
    
    // Redis経由でAdminに通知
    await eventBus.publish('request:new', {
      requestId: request.id,
      agentUniqueName: agent!.uniqueName,
      fingerprint: agent!.fingerprint,
      realm: validated.realm,
      timestamp: Date.now(),
      type: validated.type,
      containerId: agent!.id
    });
    
    res.status(202).json({
      requestId: request.id,
      state: 'pending',
      message: 'Access request submitted for approval'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Failed to submit request' });
    }
  }
});

// Redisイベントリスナー（Agentへの通知）
eventBus.subscribe('request:approved', async (data) => {
  // Forward to agent WebSocket
  agentWebSocket.sendToAgent(data.fingerprint, 'authorization_granted', {
    requestId: data.requestId,
    authorizationId: data.authorizationId,
    grantedKey: data.grantedKey,
    expiresAt: data.expiresAt,
    realm: data.realm,
    grantResult: data.grantResult
  });
});

eventBus.subscribe('request:denied', async (data) => {
  // Forward to agent WebSocket
  agentWebSocket.sendToAgent(data.fingerprint, 'authorization_denied', {
    requestId: data.requestId,
    reason: data.reason
  });
});

eventBus.subscribe('authorization:granted', async (data) => {
  console.log('Authorization granted:', data);
});

eventBus.subscribe('authorization:denied', async (data) => {
  console.log('Authorization denied:', data);
});

const server = new HttpServer(app);

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use, retrying in 3s...`);
    setTimeout(() => server.listen(port, '0.0.0.0'), 3000);
  } else {
    console.error('Server error:', err);
  }
});

const agentWebSocket = new AgentWebSocket(server);

server.listen(port, '0.0.0.0', () => {
  console.log(`Agent API server running on port ${port}`);
  console.log(`Agent WebSocket: ws://localhost:${port}/api/agent/ws`);
});

app.get('/api/websocket/stats', (req, res) => {
  res.json(agentWebSocket.getStats());
});

app.get('/api/openapi.json', (req, res) => {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent-openapi.json'), 'utf-8'));
  res.json(spec);
});

export { agentWebSocket };

// TypeScriptの型拡張
declare global {
  namespace Express {
    interface Request {
      agent?: AgentContainer;
    }
  }
}
