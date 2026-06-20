import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);

async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker inspect --format '{{.State.Running}}' ${containerName}`
    );
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

/**
 * GET: 현재 사용자의 실행 중인 Attack Box 세션 (새로고침 후 복원용)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const session = await getSession(req, res);
  const user = await getUserBySession(session);
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const row = await prisma.attackBoxSession.findUnique({
    where: { userId: user.id },
  });

  if (!row) {
    return res.status(200).json({ data: null });
  }

  // 컨테이너가 실제로 실행 중인지 확인
  const running = await isContainerRunning(row.containerName);
  if (!running) {
    // 죽은 세션 정리
    await prisma.attackBoxSession
      .delete({ where: { userId: user.id } })
      .catch(() => {});
    return res.status(200).json({ data: null });
  }

  return res.status(200).json({
    data: {
      boxName: row.boxName,
      host: row.host,
      port: row.port,
      port8080: row.port8080,
      user: row.username,
      containerName: row.containerName,
    },
  });
}
