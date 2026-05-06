import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 컨테이너 이름 prefix
const CONTAINER_PREFIX = 'learn-term-';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 고유 세션 ID 생성
    const sessionId = randomUUID();
    const containerName = `${CONTAINER_PREFIX}${sessionId}`;

    // Ubuntu 컨테이너 실행 (ttyd 설치된 이미지 사용 권장, 기본 bash)
    // ttyd는 7681 포트 사용, 실제 환경에 맞게 포트 매핑 필요
    const port = 20000 + Math.floor(Math.random() * 10000); // 20000~29999
    const image = 'ubuntu:24.04';
    // ttyd 설치된 커스텀 이미지를 사용하는 것이 좋음
    // 아래는 예시: ttyd 없이 bash만 실행 (실제 터미널 연동은 추가 작업 필요)
    const runCmd = `docker run -d --rm --name ${containerName} -p ${port}:7681 ${image} sleep infinity`;
    await execAsync(runCmd);

    // 실제로는 ttyd 등 웹 터미널 서버가 컨테이너에서 실행되어야 함
    // 프론트엔드에서 ws://host:port/ 로 접속 가능해야 함

    res.status(200).json({ sessionId, port, containerName });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
