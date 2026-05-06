import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { z } from 'zod';

const addMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  role: z.nativeEnum(Role).optional(),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can manage team members');
    }

    const teamId = req.query.teamId;
    if (typeof teamId !== 'string') {
      throw new ApiError(400, 'Invalid team id');
    }

    switch (req.method) {
      case 'GET':
        await handleGET(res, teamId);
        break;
      case 'POST':
        await handlePOST(req, res, teamId);
        break;
      case 'DELETE':
        await handleDELETE(req, res, teamId);
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

const handleGET = async (res: NextApiResponse, teamId: string) => {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({
    data: {
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
};

const handlePOST = async (req: NextApiRequest, res: NextApiResponse, teamId: string) => {
  const { userId, role } = addMemberSchema.parse(req.body);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (existing) {
    throw new ApiError(409, 'User is already a member of this team');
  }

  const member = await prisma.teamMember.create({
    data: {
      teamId,
      userId,
      role: role ?? team.defaultRole,
    },
  });

  res.status(201).json({ data: { member } });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse, teamId: string) => {
  const { userId } = removeMemberSchema.parse(req.body);

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  });

  res.status(204).end();
};
