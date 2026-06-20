import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res
        .status(405)
        .json({ error: { message: `Method ${req.method} Not Allowed` } });
      return;
    }

    const session = await getSession(req, res);
    const userId = session?.user?.id ?? null;

    const problems = await prisma.sandboxProblem.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        positionX: true,
        positionY: true,
        orderIndex: true,
        dockerImage: true,
        containerPort: true,
      },
    });

    // 현재 사용자가 푼 문제 ID 목록
    const solvedIds = userId
      ? (
          await prisma.sandboxSolve.findMany({
            where: { userId },
            select: { problemId: true },
          })
        ).map((s) => s.problemId)
      : [];

    res.status(200).json({ data: { problems, solvedIds } });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    res.status(500).json({ error: { message } });
  }
}
