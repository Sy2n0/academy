import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { awardPoints } from 'models/score';
import { calculateDynamicValue } from '@/lib/ranks';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user?.id) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }
  const userId = session.user.id;

  // POST: 플래그 제출
  if (req.method === 'POST') {
    const { problemId, flag } = req.body as { problemId: string; flag: string };
    if (!problemId || !flag) {
      return res
        .status(400)
        .json({ error: { message: 'problemId and flag are required' } });
    }

    const problem = await prisma.sandboxProblem.findUnique({
      where: { id: problemId },
    });
    if (!problem) {
      return res.status(404).json({ error: { message: 'Problem not found' } });
    }

    // 이미 풀었는지 확인
    const existing = await prisma.sandboxSolve.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });
    if (existing) {
      return res.status(200).json({ data: { result: 'already_solved' } });
    }

    // 플래그 비교
    const correct = problem.flag?.trim() === flag.trim();
    let earnedPoints: number | null = null;
    if (correct) {
      // Count solves before recording this one, so the first solver is credited
      // with the full initialValue.
      const priorSolves = await prisma.sandboxSolve.count({
        where: { problemId },
      });
      const value = calculateDynamicValue(
        problem.initialValue,
        problem.minimumValue,
        problem.decay,
        priorSolves
      );

      await prisma.sandboxSolve.create({ data: { userId, problemId } });
      // 점수 획득 — Recent Activity/스트릭/랭크에 반영
      const result = await awardPoints(
        userId,
        'SANDBOX',
        value,
        `Solved: ${problem.title}`,
        {
          problemId,
          problemTitle: problem.title,
          priorSolves,
          dynamicValue: value,
          firstBlood: priorSolves === 0,
        }
      );
      earnedPoints = result.pointsEarned;
    }

    return res.status(200).json({
      data: {
        result: correct ? 'correct' : 'wrong',
        ...(correct ? { earnedPoints } : {}),
      },
    });
  }

  // GET: 솔버 목록
  if (req.method === 'GET') {
    const { problemId } = req.query as { problemId: string };
    if (!problemId) {
      return res
        .status(400)
        .json({ error: { message: 'problemId is required' } });
    }

    const solves = await prisma.sandboxSolve.findMany({
      where: { problemId },
      orderBy: { solvedAt: 'asc' },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    return res.status(200).json({ data: { solves } });
  }

  res.setHeader('Allow', ['POST', 'GET']);
  res
    .status(405)
    .json({ error: { message: `Method ${req.method} Not Allowed` } });
}
