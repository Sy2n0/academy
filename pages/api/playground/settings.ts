import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

const ensureBadgeColumns = async () => {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PlaygroundSettings"
    ADD COLUMN IF NOT EXISTS "badgeName" TEXT,
    ADD COLUMN IF NOT EXISTS "badgeImage" TEXT,
    ADD COLUMN IF NOT EXISTS "badgeDescription" TEXT;
  `);
};

// 공개 API - Playground 설정 조회 (인증 불필요)
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
    await ensureBadgeColumns();

    const seasonParam =
      typeof req.query.season === 'string' ? decodeURIComponent(req.query.season).trim() : '';
    const normalize = (value: string) => value.toLowerCase().replace(/[-_\s]+/g, ' ').trim();

    if (seasonParam) {
      const allSettings = await prisma.playgroundSettings.findMany({
        orderBy: {
          updatedAt: 'desc',
        },
      });

      const normalizedSeasonParam = normalize(seasonParam);
      const seasonMatch = allSettings.find((item) => {
        const season = normalize(item.season || '');
        const codeName = normalize(item.codeName || '');
        return season === normalizedSeasonParam || codeName === normalizedSeasonParam;
      });

      if (seasonMatch) {
        res.json({
          data: {
            name: seasonMatch.name,
            codeName: seasonMatch.codeName,
            badgeName: seasonMatch.badgeName || '',
            badgeImage: seasonMatch.badgeImage || '',
            badgeDescription: seasonMatch.badgeDescription || '',
            season: seasonMatch.season,
            type: seasonMatch.type,
            startDate: seasonMatch.startDate || '',
            endDate: seasonMatch.endDate || '',
            description: seasonMatch.description || '',
          },
        });
        return;
      }
    }

    // 활성 설정을 가져오기 (없으면 가장 최근 설정)
    const settings = await prisma.playgroundSettings.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }) || await prisma.playgroundSettings.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!settings) {
      // 설정이 없으면 기본값 반환
      res.json({
        data: {
          name: 'Recruiting Playground',
          codeName: 'BREEZY',
          badgeName: 'BREEZY',
          badgeImage: '',
          badgeDescription: '',
          season: 'MAR-JUN 2026',
          type: 'recruiting',
          startDate: '2026-03-01',
          endDate: '2026-06-30',
          description: '',
        },
      });
      return;
    }

    res.json({
      data: {
        name: settings.name,
        codeName: settings.codeName,
        badgeName: settings.badgeName || '',
        badgeImage: settings.badgeImage || '',
        badgeDescription: settings.badgeDescription || '',
        season: settings.season,
        type: settings.type,
        startDate: settings.startDate || '',
        endDate: settings.endDate || '',
        description: settings.description || '',
      },
    });
  } catch (error) {
    console.error('Error fetching playground settings:', error);
    // 기본값 반환
    res.json({
      data: {
        name: 'Recruiting Playground',
        codeName: 'BREEZY',
        badgeName: 'BREEZY',
        badgeImage: '',
        badgeDescription: '',
        season: 'MAR-JUN 2026',
        type: 'recruiting',
        startDate: '2026-03-01',
        endDate: '2026-06-30',
        description: '',
      },
    });
  }
}
