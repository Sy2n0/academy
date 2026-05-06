import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
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
      throw new ApiError(403, 'Only admins can review writeups');
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
      throw new ApiError(400, 'Writeup ID is required');
    }

    const { status, comment } = reviewSchema.parse(req.body);

    const writeup = await prisma.writeup.update({
      where: { id },
      data: {
        status,
        reviewedBy: currentUser.id,
        reviewedAt: new Date(),
      },
    });

    // EventLog 기록
    await prisma.eventLog.create({
      data: {
        type: 'writeup_reviewed',
        userId: writeup.userId,
        message: `Writeup "${writeup.title}" ${status}`,
        metadata: {
          writeupId: id,
          status,
          comment,
        },
      },
    });

    res.json({
      data: {
        message: `Writeup ${status} successfully`,
        writeup,
      },
    });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
