import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const roleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

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
      throw new ApiError(403, 'Only admins can change user roles');
    }

    if (req.method !== 'PATCH' && req.method !== 'PUT') {
      res.setHeader('Allow', 'PATCH, PUT');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'User ID is required');
    }

    const { role } = roleSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    // EventLog 기록
    await prisma.eventLog.create({
      data: {
        type: 'user_role_changed',
        userId: id,
        message: `User ${user.name} role changed to ${role}`,
        metadata: {
          role,
        },
      },
    });

    res.json({
      data: {
        message: 'User role updated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
