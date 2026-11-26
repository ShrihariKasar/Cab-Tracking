import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { getToken } from './secureStorage';

class SocketManager {
  private socket: Socket | null = null;

  async connect(): Promise<Socket | null> {
    if (this.socket?.connected) return this.socket;
    const token = await getToken();
    if (!token) return null;

    this.socket = io(ENV.SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });
    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketManager = new SocketManager();
