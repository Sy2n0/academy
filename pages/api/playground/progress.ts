import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';
import { ScoreType } from '@prisma/client';

const normalize = (value: string) => value.trim().toLowerCase().replace(/[-_\s]+/g, ' ');
const normalizeCodeName = (value: string) => value.trim().toLowerCase();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const seasonParam = typeof req.query.season === 'string' ? decodeURIComponent(req.query.season).trim() : '';
    if (!seasonParam) {
      return res.json({ data: { rank: null, points: 0, solvedChallengeIds: [] as string[] } });
    }

    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) {
      return res.json({ data: { rank: null, points: 0, solvedChallengeIds: [] as string[] } });
    }

    const allSettings = await prisma.playgroundSettings.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const normalizedSeasonParam = normalize(seasonParam);
    const matchedSettings = allSettings.find((item) => {
      const codeName = normalize(item.codeName || '');
      const season = normalize(item.season || '');
      return codeName === normalizedSeasonParam || season === normalizedSeasonParam;
    });

    const targetCodeName = normalizeCodeName(matchedSettings?.codeName || seasonParam);

    const userScores = await prisma.scoreHistory.findMany({
      where: {
        userId: user.id,
        type: ScoreType.PLAYGROUND,
      },
      select: {
        earnedPoints: true,
        metadata: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 2000,
    });

    let points = 0;
    const solvedSet = new Set<string>();

    for (const score of userScores) {
      if (!score.metadata || typeof score.metadata !== 'object') continue;
      const metadata = score.metadata as Record<string, unknown>;

      const codeName = typeof metadata.playgroundCodeName === 'string'
        ? normalizeCodeName(metadata.playgroundCodeName)
        : '';

      if (codeName !== targetCodeName) continue;

      points += score.earnedPoints || 0;

      const challengeId = typeof metadata.challengeId === 'string' ? metadata.challengeId : '';
      if (challengeId) {
        solvedSet.add(challengeId);
      }
    }

    const seasonScores = await prisma.scoreHistory.findMany({
      where: {
        type: ScoreType.PLAYGROUND,
      },
      select: {
        userId: true,
        earnedPoints: true,
        metadata: true,
      },
      take: 50000,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const pointsByUser = new Map<string, number>();
    for (const score of seasonScores) {
      if (!score.metadata || typeof score.metadata !== 'object') continue;
      const metadata = score.metadata as Record<string, unknown>;
      const codeName = typeof metadata.playgroundCodeName === 'string'
        ? normalizeCodeName(metadata.playgroundCodeName)
        : '';
      if (codeName !== targetCodeName) continue;

      pointsByUser.set(score.userId, (pointsByUser.get(score.userId) || 0) + (score.earnedPoints || 0));
    }

    let rank: number | null = null;
    if (pointsByUser.has(user.id)) {
      const ranking = Array.from(pointsByUser.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0].localeCompare(b[0]);
        })
        .map(([userId], index) => ({ userId, rank: index + 1 }));

      rank = ranking.find((entry) => entry.userId === user.id)?.rank ?? null;
    }

    return res.json({
      data: {
        rank,
        points,
        solvedChallengeIds: Array.from(solvedSet),
      },
    });
  } catch (error) {
    console.error('Error fetching playground progress:', error);
    return res.status(500).json({ error: { message: 'Failed to fetch playground progress' } });
  }
}
