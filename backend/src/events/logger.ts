import Redis from 'ioredis';

const STREAM_KEY = 'event:log';
const MAX_LEN = 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

type BroadcastHandler = (entry: LogEntry) => void;

class EventNotifier {
  private redis: Redis;
  private broadcastHandlers: BroadcastHandler[] = [];

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  subscribe(handler: BroadcastHandler): void {
    this.broadcastHandlers.push(handler);
  }

  unsubscribe(handler: BroadcastHandler): void {
    const idx = this.broadcastHandlers.indexOf(handler);
    if (idx > -1) this.broadcastHandlers.splice(idx, 1);
  }

  private async trimStream(): Promise<void> {
    const now = Date.now();
    let entries: Array<[string, string[]]>;

    try {
      entries = await this.redis.xrange(STREAM_KEY, '-', '+');
    } catch {
      return;
    }

    if (entries.length === 0) return;

    const toRemove: string[] = [];
    for (const [id, fields] of entries) {
      const tsField = fields.find((_, i) => i % 2 === 0 && fields[i] === 'timestamp');
      if (tsField) {
        const tsIdx = fields.indexOf(tsField);
        const ts = parseInt(fields[tsIdx + 1], 10);
        if (now - ts > MAX_AGE_MS) {
          toRemove.push(id);
        }
      }
    }

    for (const id of toRemove) {
      await this.redis.xdel(STREAM_KEY, id);
    }

    const count = await this.redis.xlen(STREAM_KEY);
    if (count > MAX_LEN) {
      await this.redis.xtrim(STREAM_KEY, 'MAXLEN', '~', MAX_LEN);
    }
  }

  async notify(type: string, message: string, data?: Record<string, unknown>): Promise<void> {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    };

    await this.redis.xadd(STREAM_KEY, 'MAXLEN', '~', MAX_LEN, '*',
      'id', entry.id,
      'timestamp', new Date(entry.timestamp).getTime().toString(),
      'type', entry.type,
      'message', entry.message,
      'data', JSON.stringify(entry.data || {})
    );

    await this.trimStream();

    for (const handler of this.broadcastHandlers) {
      try {
        handler(entry);
      } catch (err) {
        console.error('[EventNotifier] Broadcast handler error:', err);
      }
    }
  }

  async getLogs(limit = 100): Promise<LogEntry[]> {
    const entries = await this.redis.xrevrange(STREAM_KEY, '+', '-', 'COUNT', limit);
    return entries.map(([id, fields]) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      return {
        id: obj.id || id,
        timestamp: obj.timestamp ? new Date(parseInt(obj.timestamp, 10)).toISOString() : new Date().toISOString(),
        type: obj.type || 'unknown',
        message: obj.message || '',
        data: obj.data ? JSON.parse(obj.data) : undefined,
      };
    });
  }

  async getStats(): Promise<{ count: number }> {
    const count = await this.redis.xlen(STREAM_KEY);
    return { count };
  }
}

export const eventNotifier = new EventNotifier();
