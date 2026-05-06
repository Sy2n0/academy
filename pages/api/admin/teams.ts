import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { createTeam } from 'models/team';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/, 'Slug may contain only letters, numbers, underscores, and dashes'),
  inviteCode: z.string().min(4).max(64).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can access team management');
    }

    switch (req.method) {
      case 'GET':
        await handleGET(res);
        break;
      case 'POST':
        await handlePOST(req, res, currentUser.id);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

const handleGET = async (res: NextApiResponse) => {
  const teams = await prisma.team.findMany({
    include: {
      members: {
        select: { userId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const teamsWithStats = await Promise.all(
    teams.map(async (team) => {
      const userIds = team.members.map((m) => m.userId);
      let totalPoints = 0;

      if (userIds.length > 0) {
        const scoreSummary = await prisma.scoreHistory.aggregate({
          where: { userId: { in: userIds } },
          _sum: { earnedPoints: true },
        });
        totalPoints = scoreSummary._sum.earnedPoints || 0;
      }

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        inviteCode: team.inviteCode,
        createdAt: team.createdAt.toISOString(),
        memberCount: team.members.length,
        totalPoints,
      };
    })
  );

  res.json({ data: { teams: teamsWithStats } });
};

const handlePOST = async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
  const { name, slug, inviteCode } = createTeamSchema.parse(req.body);

  const existing = await prisma.team.findFirst({
    where: { OR: [{ slug }, { name }] },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'A team with this name or slug already exists');
  }

  const team = await createTeam({ name, slug, userId, inviteCode });

  res.status(201).json({ data: { team } });
};
