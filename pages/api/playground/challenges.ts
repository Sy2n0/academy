import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

const normalize = (value: string) => value.trim().toLowerCase().replace(/[-_\s]+/g, ' ');
const normalizeCodeName = (value: string) => value.trim().toLowerCase();

type PublicAttachment = {
  name: string;
  size: number;
  type: string;
  key?: string;
  url?: string;
};

const sanitizePublicAttachments = (value: unknown): PublicAttachment[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map<PublicAttachment | null>((item) => {
      if (!item || typeof item !== 'object') return null;
      const target = item as {
        name?: unknown;
        size?: unknown;
        type?: unknown;
        key?: unknown;
        url?: unknown;
        scope?: unknown;
      };

      if (typeof target.name !== 'string') return null;
      if (target.scope === 'programming_answer') return null;

      const attachment: PublicAttachment = {
        name: target.name,
        size: typeof target.size === 'number' ? target.size : 0,
        type: typeof target.type === 'string' ? target.type : '',
      };

      if (typeof target.key === 'string') {
        attachment.key = target.key;
      }

      if (typeof target.url === 'string') {
        attachment.url = target.url;
      }

      return attachment;
    })
    .filter((item): item is PublicAttachment => item !== null);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
      res.json({ data: [] });
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

    if (!matchedSettings?.codeName) {
      res.status(400).json({
        error: { message: 'Invalid playground season/codeName' },
      });
      return;
    }

    const targetCodeName = matchedSettings.codeName;

    const challenges = await prisma.playgroundChallenge.findMany({
      where: {
        playgroundCodeName: normalizeCodeName(targetCodeName),
        isActive: true,
      },
      orderBy: [
        { value: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const sanitizedChallenges = challenges.map((challenge) => ({
      ...challenge,
      attachments: sanitizePublicAttachments(challenge.attachments),
    }));

    res.json({
      data: sanitizedChallenges,
    });
  } catch (error) {
    console.error('Error fetching playground challenges:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch playground challenges' },
    });
  }
}
