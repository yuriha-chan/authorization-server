import type { WebSocketMessage } from './types';

type MessageHandler = (msg: WebSocketMessage) => void;
type ConnectionHandler = () => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private isConnecting = false;
  private isConnected = false;
  private messageHandlers: MessageHandler[] = [];
  private connectHandlers: ConnectionHandler[] = [];
  private url: string;
  private closed = false;

  constructor(url: string) {
    this.url = url;
  }

  get isReady(): boolean {
    return this.isConnected;
  }

  connect(): void {
    if (this.closed || this.isConnecting || this.isConnected) {
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.isConnected = true;
      this.retryCount = 0;
      this.connectHandlers.forEach((h) => h());
      this.heartbeatInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 5000);
    };

    this.ws.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);
      this.messageHandlers.forEach((h) => h(msg));
    };

    this.ws.onerror = () => console.error('WebSocket error');

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.isConnected = false;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      if (this.closed || this.reconnectTimeout) {
        return;
      }
      this.retryCount++;
      const delay = this.retryCount === 2 ? 10000 : 3000;
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, delay);
    };
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const idx = this.messageHandlers.indexOf(handler);
      if (idx >= 0) {
        this.messageHandlers.splice(idx, 1);
      }
    };
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.push(handler);
    return () => {
      const idx = this.connectHandlers.indexOf(handler);
      if (idx >= 0) {
        this.connectHandlers.splice(idx, 1);
      }
    };
  }

  close(): void {
    this.closed = true;
    this.isConnected = false;
    this.isConnecting = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
