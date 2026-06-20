import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

/**
 * WebSocket 프록시를 통한 TCP 트래픽 포워딩
 * 컨테이너의 트래픽을 캡처하고 WebSocket을 통해 전달
 */
export class TrafficCaptureProxy {
  private io: SocketIOServer;
  private connections: Map<string, any> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupWebSocketProxy();
  }

  /**
   * WebSocket 프록시 설정
   */
  private setupWebSocketProxy(): void {
    this.io.on('connection', (socket) => {
      socket.on(
        'proxy:connect',
        async (data: {
          containerId: string;
          targetHost: string;
          targetPort: number;
        }) => {
          try {
            // TCP 연결을 WebSocket을 통해 프록시
            const proxyId = `${data.containerId}-${Date.now()}`;

            socket.emit('proxy:connected', { proxyId });

            // 프록시 연결 저장
            this.connections.set(proxyId, {
              socket,
              containerId: data.containerId,
              targetHost: data.targetHost,
              targetPort: data.targetPort,
              startTime: new Date(),
            });

            // 데이터 전송 핸들러
            socket.on(
              'proxy:data',
              (proxyData: { proxyId: string; data: Buffer }) => {
                // 실제 TCP 연결로 데이터 전송 (구현 필요)
                // 여기서는 WebSocket을 통해 데이터를 전달
                this.handleProxyData(proxyData.proxyId, proxyData.data);
              }
            );

            socket.on('disconnect', () => {
              this.connections.delete(proxyId);
            });
          } catch (error: any) {
            socket.emit('proxy:error', { message: error.message });
          }
        }
      );
    });
  }

  /**
   * 프록시 데이터 처리
   */
  private handleProxyData(proxyId: string, data: Buffer): void {
    const connection = this.connections.get(proxyId);
    if (!connection) {
      return;
    }

    // 트래픽 캡처 (로깅)
    this.captureTraffic(connection.containerId, data);

    // 실제 TCP 연결로 데이터 전송 (구현 필요)
    // 여기서는 예시로 WebSocket을 통해 응답
    connection.socket.emit('proxy:response', {
      proxyId,
      data: data.toString('base64'),
    });
  }

  /**
   * 트래픽 캡처 및 저장
   */
  private async captureTraffic(
    containerId: string,
    data: Buffer
  ): Promise<void> {
    // 트래픽을 파일이나 DB에 저장
    // EventLog에 기록
    const { prisma } = await import('@/lib/prisma');

    await prisma.eventLog.create({
      data: {
        type: 'traffic_capture',
        message: `Traffic captured from container ${containerId}`,
        metadata: {
          containerId,
          dataSize: data.length,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * 프록시 연결 종료
   */
  public closeProxy(proxyId: string): void {
    const connection = this.connections.get(proxyId);
    if (connection) {
      connection.socket.disconnect();
      this.connections.delete(proxyId);
    }
  }
}
