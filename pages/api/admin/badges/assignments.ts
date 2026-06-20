import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ensureBadgeInfrastructure } from '@/lib/badges';
import { randomUUID } from 'crypto';

const assignSchema = z.object({
  badgeId: z.string().min(1),
  userId: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) throw new ApiError(401, 'Unauthorized');
    if (!isAdmin(currentUser.role))
      throw new ApiError(403, 'Only admins can manage badge assignments');

    await ensureBadgeInfrastructure();

    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'POST':
        await handlePOST(req, res, currentUser.id);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, DELETE');
        res
          .status(405)
          .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  type AssignmentRow = {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    badgeId: string;
    badgeName: string;
    createdAt: Date;
  };

  let assignments: AssignmentRow[] = [];

  if (q) {
    const keyword = `%${q}%`;
    assignments = await prisma.$queryRaw<AssignmentRow[]>`
      SELECT
        uba."id",
        u."id" AS "userId",
        u."name" AS "userName",
        u."email" AS "userEmail",
        bc."id" AS "badgeId",
        bc."name" AS "badgeName",
        uba."createdAt"
      FROM "UserBadgeAssignment" uba
      JOIN "User" u ON u."id" = uba."userId"
      JOIN "BadgeCatalog" bc ON bc."id" = uba."badgeId"
      WHERE u."name" ILIKE ${keyword} OR u."email" ILIKE ${keyword}
      ORDER BY uba."createdAt" DESC
      LIMIT 200
    `;
  } else {
    assignments = await prisma.$queryRaw<AssignmentRow[]>`
      SELECT
        uba."id",
        u."id" AS "userId",
        u."name" AS "userName",
        u."email" AS "userEmail",
        bc."id" AS "badgeId",
        bc."name" AS "badgeName",
        uba."createdAt"
      FROM "UserBadgeAssignment" uba
      JOIN "User" u ON u."id" = uba."userId"
      JOIN "BadgeCatalog" bc ON bc."id" = uba."badgeId"
      ORDER BY uba."createdAt" DESC
      LIMIT 200
    `;
  }

  res.json({
    data: assignments.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  });
};

const handlePOST = async (
  req: NextApiRequest,
  res: NextApiResponse,
  createdById: string
) => {
  const parsed = assignSchema.parse(req.body);

  let targetUserId = parsed.userId;
  if (!targetUserId && parsed.userEmail) {
    const target = await prisma.user.findUnique({
      where: { email: parsed.userEmail },
      select: { id: true },
    });
    if (!target) throw new ApiError(404, 'User not found with that email');
    targetUserId = target.id;
  }

  if (!targetUserId) throw new ApiError(400, 'userId or userEmail is required');

  const assignmentId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "UserBadgeAssignment" ("id", "userId", "badgeId", "createdById")
    VALUES (${assignmentId}, ${targetUserId}, ${parsed.badgeId}, ${createdById})
    ON CONFLICT ("userId", "badgeId") DO NOTHING
  `;

  res.json({ data: { message: 'Badge assigned' } });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const id = (
    typeof req.query.id === 'string' ? req.query.id : req.body?.id
  ) as string | undefined;
  if (!id) throw new ApiError(400, 'Assignment id is required');

  await prisma.$executeRaw`DELETE FROM "UserBadgeAssignment" WHERE "id" = ${id}`;

  res.json({ data: { message: 'Assignment deleted' } });
};
