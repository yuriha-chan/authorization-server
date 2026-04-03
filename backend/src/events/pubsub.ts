// src/events/redis-pubsub.ts
import Redis from 'ioredis';

class EventBus {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Array<(data: any) => void>> = new Map();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    
    this.setupSubscriber();
  }

  private setupSubscriber() {
    this.subscriber.on('message', (channel, message) => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        try {
          const data = JSON.parse(message);
          handlers.forEach(handler => handler(data));
        } catch (error) {
          console.error('Failed to parse event message:', error);
        }
      }
    });
  }

  async publish(channel: string, data: any) {
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  subscribe(channel: string, handler: (data: any) => void) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      this.subscriber.subscribe(channel);
    }
    this.handlers.get(channel)!.push(handler);
  }

  unsubscribe(channel: string, handler?: (data: any) => void) {
    if (handler) {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.handlers.delete(channel);
          this.subscriber.unsubscribe(channel);
        }
      }
    } else {
      this.handlers.delete(channel);
      this.subscriber.unsubscribe(channel);
    }
  }
}

export const eventBus = new EventBus();
