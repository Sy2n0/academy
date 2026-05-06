import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ScoreType, UserRole } from '@prisma/client';

const normalize = (value: string) => value.trim().toLowerCase().replace(/[-_\s]+/g, ' ');
const normalizeCodeName = (value: string) => value.trim().toLowerCase();

type ScoreboardItem = {
  rank: number;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  points: number;
  solvedCount: number;
  solvedChallengeIds: string[];
  firstBloodChallengeIds: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const seasonParam = typeof req.query.season === 'string' ? decodeURIComponent(req.query.season).trim() : '';
    if (!seasonParam) {
      return res.json({ data: [] as ScoreboardItem[] });
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

    const targetPlayground = matchedSettings
      ? matchedSettings
      : allSettings.find((item) => normalizeCodeName(item.codeName || '') === targetCodeName) || null;

    const enrollmentRows = targetPlayground
      ? await prisma.playgroundEnrollment.findMany({
          where: {
            playgroundId: targetPlayground.id,
          },
          select: {
            userId: true,
          },
        })
      : [];

    const scoreRows = await prisma.scoreHistory.findMany({
      where: {
        type: ScoreType.PLAYGROUND,
      },
      select: {
        userId: true,
        earnedPoints: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50000,
    });

    const byUser = new Map<string, { points: number; solvedSet: Set<string>; firstBloodSet: Set<string> }>();
    const firstBloodByChallenge = new Map<string, { userId: string; createdAtMs: number }>();

    for (const enrollment of enrollmentRows) {
      if (!byUser.has(enrollment.userId)) {
        byUser.set(enrollment.userId, { points: 0, solvedSet: new Set<string>(), firstBloodSet: new Set<string>() });
      }
    }

    for (const row of scoreRows) {
      if (!row.metadata || typeof row.metadata !== 'object') continue;
      const metadata = row.metadata as Record<string, unknown>;

      const metadataCodeName = typeof metadata.playgroundCodeName === 'string'
        ? normalizeCodeName(metadata.playgroundCodeName)
        : '';

      if (metadataCodeName !== targetCodeName) continue;

      const current = byUser.get(row.userId) || { points: 0, solvedSet: new Set<string>(), firstBloodSet: new Set<string>() };
      current.points += row.earnedPoints || 0;

      const challengeId = typeof metadata.challengeId === 'string' ? metadata.challengeId : '';
      if (challengeId) current.solvedSet.add(challengeId);

      if (challengeId && (row.earnedPoints || 0) > 0) {
        const createdAtMs = row.createdAt.getTime();
        const previous = firstBloodByChallenge.get(challengeId);
        if (!previous || createdAtMs < previous.createdAtMs) {
          firstBloodByChallenge.set(challengeId, {
            userId: row.userId,
            createdAtMs,
          });
        }
      }

      byUser.set(row.userId, current);
    }

    for (const [challengeId, winner] of firstBloodByChallenge.entries()) {
      const winnerStats = byUser.get(winner.userId);
      if (!winnerStats) continue;
      winnerStats.firstBloodSet.add(challengeId);
    }

    const userIds = Array.from(byUser.keys());
    if (userIds.length === 0) {
      return res.json({ data: [] as ScoreboardItem[] });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: {
          not: UserRole.ADMIN,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    const rows: Omit<ScoreboardItem, 'rank'>[] = users.map((user) => {
      const stat = byUser.get(user.id) || {
        points: 0,
        solvedSet: new Set<string>(),
        firstBloodSet: new Set<string>(),
      };
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        points: stat.points,
        solvedCount: stat.solvedSet.size,
        solvedChallengeIds: Array.from(stat.solvedSet),
        firstBloodChallengeIds: Array.from(stat.firstBloodSet),
      };
    });

    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      return a.name.localeCompare(b.name);
    });

    const ranked: ScoreboardItem[] = rows.map((row, index) => ({
      rank: index + 1,
      ...row,
    }));

    return res.json({ data: ranked });
  } catch (error) {
    console.error('Error fetching playground scoreboard:', error);
    return res.status(500).json({ error: { message: 'Failed to fetch playground scoreboard' } });
  }
}
