import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const normalize = (value: string) => value.trim().toLowerCase().replace(/[-_\s]+/g, ' ');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    if (!isAdmin(currentUser.role)) {
      return res.status(403).json({ error: { message: 'Only admins can view playground flag submissions' } });
    }

    const seasonParam = typeof req.query.season === 'string' ? decodeURIComponent(req.query.season).trim() : '';
    const challengeIdParam = typeof req.query.challengeId === 'string' ? req.query.challengeId.trim() : 'all';

    if (!seasonParam) {
      return res.status(400).json({ error: { message: 'season is required' } });
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
      return res.status(400).json({ error: { message: 'Invalid playground season/codeName' } });
    }

    const baseCodeName = matchedSettings.codeName.toLowerCase();

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      challengeId: string;
      challengeTitle: string;
      category: string | null;
      difficulty: string | null;
      userId: string;
      userName: string | null;
      userEmail: string | null;
      submittedFlag: string;
      isCorrect: boolean;
      submissionMethod: string;
      attemptNumber: number;
      createdAt: Date;
    }>>(
      challengeIdParam && challengeIdParam !== 'all'
        ? Prisma.sql`
          SELECT
            pfs."id" as "id",
            pfs."challengeId" as "challengeId",
            pfs."challengeTitle" as "challengeTitle",
            pc."category" as "category",
            pc."difficulty" as "difficulty",
            pfs."userId" as "userId",
            u."name" as "userName",
            u."email" as "userEmail",
            pfs."submittedFlag" as "submittedFlag",
            pfs."isCorrect" as "isCorrect",
            pfs."submissionMethod" as "submissionMethod",
            pfs."attemptNumber" as "attemptNumber",
            pfs."createdAt" as "createdAt"
          FROM "PlaygroundFlagSubmission" pfs
          LEFT JOIN "PlaygroundChallenge" pc ON pc."id" = pfs."challengeId"
          LEFT JOIN "User" u ON u."id" = pfs."userId"
          WHERE pfs."playgroundCodeName" = ${baseCodeName}
            AND pfs."challengeId" = ${challengeIdParam}
          ORDER BY pfs."createdAt" DESC
          LIMIT 1000
        `
        : Prisma.sql`
          SELECT
            pfs."id" as "id",
            pfs."challengeId" as "challengeId",
            pfs."challengeTitle" as "challengeTitle",
            pc."category" as "category",
            pc."difficulty" as "difficulty",
            pfs."userId" as "userId",
            u."name" as "userName",
            u."email" as "userEmail",
            pfs."submittedFlag" as "submittedFlag",
            pfs."isCorrect" as "isCorrect",
            pfs."submissionMethod" as "submissionMethod",
            pfs."attemptNumber" as "attemptNumber",
            pfs."createdAt" as "createdAt"
          FROM "PlaygroundFlagSubmission" pfs
          LEFT JOIN "PlaygroundChallenge" pc ON pc."id" = pfs."challengeId"
          LEFT JOIN "User" u ON u."id" = pfs."userId"
          WHERE pfs."playgroundCodeName" = ${baseCodeName}
          ORDER BY pfs."createdAt" DESC
          LIMIT 1000
        `
    );

    res.json({
      data: rows.map((item) => ({
        id: item.id,
        challengeId: item.challengeId,
        challengeTitle: item.challengeTitle,
        category: item.category || '',
        difficulty: item.difficulty || '',
        userId: item.userId,
        userName: item.userName || 'Unknown',
        userEmail: item.userEmail || '',
        submittedFlag: item.submittedFlag,
        isCorrect: item.isCorrect,
        submissionMethod: item.submissionMethod,
        attemptNumber: item.attemptNumber,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching playground flag submissions:', error);
    return res.status(500).json({ error: { message: 'Failed to fetch playground flag submissions' } });
  }
}
