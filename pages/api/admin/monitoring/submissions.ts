import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can access monitoring');
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    const { machineId, userId, teamId, limit, offset } = req.query;

    const submissions = await prisma.flagSubmission.findMany({
      where: {
        ...(machineId && typeof machineId === 'string' ? { machineId } : {}),
        ...(userId && typeof userId === 'string' ? { userId } : {}),
        ...(teamId && typeof teamId === 'string' ? { teamId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        machine: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit ? parseInt(limit as string) : 100,
      skip: offset ? parseInt(offset as string) : 0,
    });

    const total = await prisma.flagSubmission.count({
      where: {
        ...(machineId && typeof machineId === 'string' ? { machineId } : {}),
        ...(userId && typeof userId === 'string' ? { userId } : {}),
        ...(teamId && typeof teamId === 'string' ? { teamId } : {}),
      },
    });

    res.json({
      data: {
        submissions,
        total,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
