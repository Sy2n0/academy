import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

/**
 * WebSocket 서버 초기화
 */
export function initWebSocket(server: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || '*',
      methods: ['GET', 'POST'],
    },
    path: '/api/socket',
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * WebSocket 서버 인스턴스 가져오기
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * 이벤트 브로드캐스트
 */
export function broadcastEvent(
  type: string,
  data: any,
  room?: string
): void {
  if (!io) {
    console.warn('WebSocket server not initialized');
    return;
  }

  if (room) {
    io.to(room).emit(type, data);
  } else {
    io.emit(type, data);
  }
}

/**
 * 특정 사용자에게 이벤트 전송
 */
export function sendToUser(userId: string, type: string, data: any): void {
  if (!io) {
    console.warn('WebSocket server not initialized');
    return;
  }

  io.to(`user:${userId}`).emit(type, data);
}
