import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserScoreHistory } from 'models/score';
import { ScoreType } from '@prisma/client';
import { ApiError } from '@/lib/errors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET');
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

const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req, res);

  if (!session || !session.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const userId = session.user.id;
  const { type, limit } = req.query;

  const history = await getUserScoreHistory(
    userId,
    type ? (type as ScoreType) : undefined,
    limit ? parseInt(limit as string, 10) : 50
  );

  res.status(200).json({
    data: history,
  });
};
