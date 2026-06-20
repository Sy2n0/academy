import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import {
  createContainer,
  stopContainer,
  removeContainer,
  findAvailablePort,
  getContainerStatus,
} from '@/lib/docker';

const ATTACKBOX_HOST = process.env.ATTACKBOX_HOST || 'localhost';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user?.id) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }
  const userId = session.user.id;

  // POST: 인스턴스 생성
  if (req.method === 'POST') {
    const { problemId } = req.body as { problemId: string };
    if (!problemId) {
      return res
        .status(400)
        .json({ error: { message: 'problemId is required' } });
    }

    const problem = await prisma.sandboxProblem.findUnique({
      where: { id: problemId },
    });
    if (!problem || !problem.dockerImage) {
      return res.status(404).json({
        error: { message: 'Problem not found or has no docker image' },
      });
    }

    // 이미 실행 중인 인스턴스가 있으면 컨테이너 상태 확인 후 반환
    const existing = await prisma.sandboxInstance.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });
    if (existing) {
      const { running } = await getContainerStatus(existing.containerId);
      if (running) {
        return res.status(200).json({
          data: {
            host: existing.host,
            port: existing.port,
            containerId: existing.containerId,
          },
        });
      }
      // 컨테이너가 죽어있으면 DB 레코드 정리 후 새로 생성
      await removeContainer(existing.containerId).catch(() => {});
      await prisma.sandboxInstance.delete({
        where: { userId_problemId: { userId, problemId } },
      });
    }

    // 20000~30000 랜덤 빈 포트 찾기
    const port = await findAvailablePort(20000, 30000);

    // 컨테이너 실행
    const { containerId } = await createContainer(problem.dockerImage, [
      { host: port, container: problem.containerPort },
    ]);

    // DB 저장
    await prisma.sandboxInstance.create({
      data: { userId, problemId, containerId, host: ATTACKBOX_HOST, port },
    });

    return res.status(201).json({
      data: { host: ATTACKBOX_HOST, port, containerId },
    });
  }

  // DELETE: 인스턴스 중지 및 삭제
  if (req.method === 'DELETE') {
    const { problemId } = req.query as { problemId: string };
    if (!problemId) {
      return res
        .status(400)
        .json({ error: { message: 'problemId is required' } });
    }

    const instance = await prisma.sandboxInstance.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });
    if (!instance) {
      return res.status(404).json({ error: { message: 'Instance not found' } });
    }

    await stopContainer(instance.containerId).catch(() => {});
    await removeContainer(instance.containerId).catch(() => {});
    await prisma.sandboxInstance.delete({
      where: { userId_problemId: { userId, problemId } },
    });

    return res.status(200).json({ data: { message: 'Instance stopped' } });
  }

  res.setHeader('Allow', ['POST', 'DELETE']);
  res
    .status(405)
    .json({ error: { message: `Method ${req.method} Not Allowed` } });
}
