import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function connectAdminSocket(): Socket | null {
  const token = sessionStorage.getItem('admin_access_token');
  if (!token) return null;
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectAdminSocket(): void {
  socket?.disconnect();
  socket = null;
}
