import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ScoreType } from '@prisma/client';

const normalizeCodeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ');

type SolveItem = {
  id: string;
  userName: string;
  createdAt: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res
      .status(405)
      .json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const challengeId =
      typeof req.query.challengeId === 'string' ? req.query.challengeId : '';
    const seasonParam =
      typeof req.query.season === 'string'
        ? decodeURIComponent(req.query.season).trim()
        : '';
    const challengeTitle =
      typeof req.query.title === 'string' ? req.query.title.trim() : '';

    if (!challengeId && !challengeTitle) {
      return res
        .status(400)
        .json({ error: { message: 'challengeId or title is required' } });
    }

    let targetCodeName = '';
    if (seasonParam) {
      const allSettings = await prisma.playgroundSettings.findMany({
        orderBy: { updatedAt: 'desc' },
      });
      const normalizedSeason = normalizeCodeName(seasonParam);
      const matched = allSettings.find((item) => {
        const codeName = normalizeCodeName(item.codeName || '');
        const season = normalizeCodeName(item.season || '');
        return codeName === normalizedSeason || season === normalizedSeason;
      });
      targetCodeName = normalizeCodeName(matched?.codeName || seasonParam);
    }

    const scores = await prisma.scoreHistory.findMany({
      where: {
        type: ScoreType.PLAYGROUND,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    const seenUsers = new Set<string>();
    const solves: SolveItem[] = [];

    for (const entry of scores) {
      if (!entry.metadata || typeof entry.metadata !== 'object') continue;

      const metadata = entry.metadata as Record<string, unknown>;
      const metadataChallengeId =
        typeof metadata.challengeId === 'string' ? metadata.challengeId : '';
      const metadataChallengeTitle =
        typeof metadata.challengeTitle === 'string'
          ? metadata.challengeTitle
          : '';
      const metadataCodeName =
        typeof metadata.playgroundCodeName === 'string'
          ? normalizeCodeName(metadata.playgroundCodeName)
          : '';

      const challengeMatchedById = challengeId
        ? metadataChallengeId === challengeId
        : false;
      const challengeMatchedByTitle = challengeTitle
        ? metadataChallengeTitle === challengeTitle
        : false;
      const challengeMatched = challengeMatchedById || challengeMatchedByTitle;

      if (!challengeMatched) continue;
      if (targetCodeName && metadataCodeName !== targetCodeName) continue;

      if (seenUsers.has(entry.userId)) continue;
      seenUsers.add(entry.userId);

      solves.push({
        id: entry.id,
        userName: entry.user?.name || 'Unknown',
        createdAt: entry.createdAt.toISOString(),
      });

      if (solves.length >= 100) break;
    }

    return res.status(200).json({ data: solves });
  } catch (error) {
    console.error('Error fetching challenge solves:', error);
    return res
      .status(500)
      .json({ error: { message: 'Failed to fetch challenge solves' } });
  }
}
