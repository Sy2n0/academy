// WebSocket 연결은 server.ts에서 처리
// 이 파일은 클라이언트 연결을 위한 엔드포인트

export default function handler(req: any, res: any) {
  res.status(200).json({ message: 'WebSocket endpoint' });
}
