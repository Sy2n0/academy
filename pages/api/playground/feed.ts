import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ScoreType } from '@prisma/client';

const normalize = (value: string) => value.trim().toLowerCase().replace(/[-_\s]+/g, ' ');
const normalizeCodeName = (value: string) => value.trim().toLowerCase();

type FeedItem = {
  id: string;
  message: string;
  createdAt: string;
};

const toMessage = (userName: string, description: string | null, metadata: unknown): string => {
  const actor = userName?.trim() || 'Someone';

  if (metadata && typeof metadata === 'object') {
    const target = metadata as Record<string, unknown>;
    const challengeTitle = typeof target.challengeTitle === 'string' ? target.challengeTitle : null;

    if (challengeTitle) {
      return `${actor} solved ${challengeTitle}`;
    }
  }

  if (description && description.trim()) {
    return `${actor} ${description.trim()}`;
  }

  return `${actor} solved a challenge`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      error: { message: `Method ${req.method} Not Allowed` },
    });
    return;
  }

  try {
    const seasonParam = typeof req.query.season === 'string' ? decodeURIComponent(req.query.season).trim() : '';

    if (!seasonParam) {
      res.json({ data: [] as FeedItem[] });
      return;
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

    const recentScores = await prisma.scoreHistory.findMany({
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
      take: 200,
    });

    const feed: FeedItem[] = recentScores
      .filter((entry) => {
        if (!entry.metadata || typeof entry.metadata !== 'object') return false;
        const metadata = entry.metadata as Record<string, unknown>;
        const metadataCodeName = typeof metadata.playgroundCodeName === 'string'
          ? normalizeCodeName(metadata.playgroundCodeName)
          : '';
        return metadataCodeName === targetCodeName;
      })
      .slice(0, 30)
      .map((entry) => ({
        id: entry.id,
        message: toMessage(entry.user?.name || 'Someone', entry.description, entry.metadata),
        createdAt: entry.createdAt.toISOString(),
      }));

    res.json({
      data: feed,
    });
  } catch (error) {
    console.error('Error fetching playground feed:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch playground feed' },
    });
  }
}
