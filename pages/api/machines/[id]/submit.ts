import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { submitFlag } from 'models/flag-submission';
import { z } from 'zod';

const submitFlagSchema = z.object({
  flag: z.string().min(1, 'Flag is required'),
  teamId: z.string().optional().nullable(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (currentUser.isBlocked) {
      throw new ApiError(403, 'Your account has been blocked');
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Machine ID is required');
    }

    const { flag, teamId } = submitFlagSchema.parse(req.body);

    const result = await submitFlag(id, currentUser.id, teamId || null, flag);

    res.json({
      data: result,
    });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
