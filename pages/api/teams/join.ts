import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { joinTeamByInviteCode } from 'models/team';
import { z } from 'zod';

const joinTeamSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
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

    const { inviteCode } = joinTeamSchema.parse(req.body);

    const result = await joinTeamByInviteCode(inviteCode, currentUser.id);

    res.json({
      data: {
        message: 'Successfully joined team',
        team: result,
      },
    });
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
