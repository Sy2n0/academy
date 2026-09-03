import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { awardPoints } from 'models/score';
import { ScoreType } from '@prisma/client';
import { ApiError } from '@/lib/errors';
import { getUser } from 'models/user';
import { validateWithSchema } from '@/lib/zod';
import { z } from 'zod';

const addPlaygroundScoreSchema = z.object({
  userId: z.string().uuid(),
  basePoints: z.number().int().positive(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    if (!res.headersSent) {
      res.status(status).json({ error: { message } });
    }
  }
}

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req, res);

  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // ADMIN 권한 확인
  const user = await getUser({ id: session.user.id });
  if (!user || user.role !== 'ADMIN') {
    throw new ApiError(403, 'Only ADMIN users can add playground scores');
  }

  const body = validateWithSchema(addPlaygroundScoreSchema, req.body);

  // 대상 사용자 확인
  const targetUser = await getUser({ id: body.userId });
  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  const result = await awardPoints(
    body.userId,
    ScoreType.PLAYGROUND,
    body.basePoints,
    body.description || `Playground score added by ${user.name}`,
    body.metadata
  );

  res.status(200).json({
    data: {
      pointsEarned: result.pointsEarned,
      totalPoints: result.user.totalPoints,
      currentRank: result.user.currentRank,
      rankUp: result.rankUp,
    },
  });
};
