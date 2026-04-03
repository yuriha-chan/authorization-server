// src/admin/server.ts
import express from 'express';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import { AdminWebSocket } from '../websocket/admin';
import { agentsRouter } from './routes/agents';
import { grantsRouter } from './routes/grants';
import { notificationsRouter } from './routes/notifications';
import { requestsRouter } from './routes/requests';

const app = express();
const port = parseInt(process.env.ADMIN_PORT || '8081');

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), role: 'admin' });
});
app.use('/api/agents', agentsRouter);
app.use('/api/grants', grantsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/requests', requestsRouter);

const server = new HttpServer(app);
const adminWebSocket = new AdminWebSocket(server);

server.listen(port, '0.0.0.0', () => {
  console.log(`Admin API server running on port ${port}`);
  console.log(`Admin WebSocket: ws://localhost:${port}/api/admin/ws`);
});

app.get('/api/websocket/stats', (req, res) => {
  res.json(adminWebSocket.getStats());
});

export { adminWebSocket };
