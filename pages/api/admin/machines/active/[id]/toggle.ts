import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const toggleSchema = z.object({
  isActive: z.boolean(),
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
      throw new ApiError(403, 'Only admins can manage machines');
    }

    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Machine ID is required');
    }

    const { isActive } = toggleSchema.parse(req.body);

    const machine = await prisma.machine.update({
      where: { id },
      data: { isActive },
    });

    // EventLog 기록
    await prisma.eventLog.create({
      data: {
        type: 'machine_status_changed',
        machineId: id,
        message: `Machine "${machine.title}" ${isActive ? 'activated' : 'deactivated'}`,
        metadata: {
          isActive,
        },
      },
    });

    res.json({
      data: {
        message: `Machine ${isActive ? 'activated' : 'deactivated'} successfully`,
        machine: {
          id: machine.id,
          title: machine.title,
          isActive: machine.isActive,
        },
      },
    });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
