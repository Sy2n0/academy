import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ensureBadgeInfrastructure } from '@/lib/badges';
import { randomUUID } from 'crypto';

const upsertSchema = z.object({
  playgroundCodeName: z.string().min(1),
  badgeId: z.string().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) throw new ApiError(401, 'Unauthorized');
    if (!isAdmin(currentUser.role)) throw new ApiError(403, 'Only admins can manage badge mappings');

    await ensureBadgeInfrastructure();

    switch (req.method) {
      case 'GET':
        await handleGET(res);
        break;
      case 'POST':
        await handlePOST(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, DELETE');
        res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

const handleGET = async (res: NextApiResponse) => {
  const playgrounds = await prisma.$queryRaw<Array<{ codeName: string; name: string; updatedAt: Date }>>`
    SELECT DISTINCT ON ("codeName") "codeName", "name", "updatedAt"
    FROM "PlaygroundSettings"
    ORDER BY "codeName", "updatedAt" DESC
  `;

  const mappings = await prisma.$queryRaw<Array<{
    playgroundCodeName: string;
    badgeId: string;
    badgeName: string;
  }>>`
    SELECT pbm."playgroundCodeName", pbm."badgeId", bc."name" AS "badgeName"
    FROM "PlaygroundBadgeMapping" pbm
    JOIN "BadgeCatalog" bc ON bc."id" = pbm."badgeId"
  `;

  res.json({
    data: {
      playgrounds: playgrounds.map((item) => ({
        ...item,
        updatedAt: item.updatedAt.toISOString(),
      })),
      mappings,
    },
  });
};

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const parsed = upsertSchema.parse(req.body);
  const mappingId = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "PlaygroundBadgeMapping" ("id", "playgroundCodeName", "badgeId")
    VALUES (${mappingId}, ${parsed.playgroundCodeName}, ${parsed.badgeId})
    ON CONFLICT ("playgroundCodeName")
    DO UPDATE SET "badgeId" = EXCLUDED."badgeId", "updatedAt" = CURRENT_TIMESTAMP
  `;

  res.json({ data: { message: 'Mapping saved' } });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const playgroundCodeName =
    (typeof req.query.playgroundCodeName === 'string' ? req.query.playgroundCodeName : req.body?.playgroundCodeName) as
      | string
      | undefined;

  if (!playgroundCodeName) throw new ApiError(400, 'playgroundCodeName is required');

  await prisma.$executeRaw`
    DELETE FROM "PlaygroundBadgeMapping"
    WHERE "playgroundCodeName" = ${playgroundCodeName}
  `;

  res.json({ data: { message: 'Mapping deleted' } });
};
