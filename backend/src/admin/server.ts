// src/admin/server.ts
import express from 'express';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import { AdminWebSocket } from '../websocket/admin';
import { agentsRouter } from './routes/agents';
import { grantsRouter } from './routes/grants';
import { grantTypesRouter } from './routes/grant-types';
import { notificationsRouter } from './routes/notifications';
import { requestsRouter } from './routes/requests';
import { authorizationsRouter } from './routes/authorizations';
import { eventsRouter } from './routes/events';
import { AppDataSource } from '../db/data-source';
import { AgentContainer } from '../entities/AgentContainer';
import { Authorization } from '../entities/Authorization';
import fs from 'fs';
import path from 'path';

const app = express();
const port = parseInt(process.env.ADMIN_PORT || '8081');

AppDataSource.initialize().catch((err: any) => console.error('DB init failed:', err));

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), role: 'admin' });
});

app.get('/api/overview', async (req, res) => {
  try {
    const agentRepo = AppDataSource.getRepository(AgentContainer);
    const authRepo = AppDataSource.getRepository(Authorization);

    const [activeAgents, totalAgents] = await Promise.all([
      agentRepo.count({ where: { state: 'active' } }),
      agentRepo.count()
    ]);

    const [activeAuthorizations, totalAuthorizations] = await Promise.all([
      authRepo.count({ where: { state: 'active' } }),
      authRepo.count()
    ]);

    res.json({
      agents: {
        active: activeAgents,
        total: totalAgents
      },
      authorizations: {
        active: activeAuthorizations,
        total: totalAuthorizations
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

app.use('/api/agents', agentsRouter);
app.use('/api/grants', grantsRouter);
app.use('/api/grant-types', grantTypesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/authorizations', authorizationsRouter);
app.use('/api/events', eventsRouter);

// deliver frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = new HttpServer(app);

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use, retrying in 3s...`);
    setTimeout(() => server.listen(port, '0.0.0.0'), 3000);
  } else {
    console.error('Server error:', err);
  }
});

const adminWebSocket = new AdminWebSocket(server);

server.listen(port, '0.0.0.0', () => {
  console.log(`Admin API server running on port ${port}`);
  console.log(`Admin WebSocket: ws://localhost:${port}/api/admin/ws`);
});

app.get('/api/websocket/stats', (req, res) => {
  res.json(adminWebSocket.getStats());
});

app.get('/api/openapi.json', (req, res) => {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'admin-openapi.json'), 'utf-8'));
  res.json(spec);
});

export { adminWebSocket };
