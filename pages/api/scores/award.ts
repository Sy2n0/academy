import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { awardPoints } from 'models/score';
import { ScoreType } from '@prisma/client';
import { ApiError } from '@/lib/errors';
import { validateWithSchema } from '@/lib/zod';
import { z } from 'zod';

const awardPointsSchema = z.object({
  type: z.enum(['MACHINE', 'TRACK', 'PLAYGROUND']),
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

    console.error('=== Award Points API Error ===');
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('Error stack:', error.stack);
    console.error('========================');

    if (!res.headersSent) {
      res.status(status).json({ error: { message } });
    }
  }
}

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req, res);

  if (!session || !session.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const userId = session.user.id;
  const body = validateWithSchema(awardPointsSchema, req.body);

  const result = await awardPoints(
    userId,
    body.type as ScoreType,
    body.basePoints,
    body.description,
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
