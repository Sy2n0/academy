import type { NextApiRequest, NextApiResponse } from 'next';
import { getRankingsByType, getUserRankingByType } from 'models/score';
import { getSession } from '@/lib/session';
import { ScoreType } from '@prisma/client';
import { getUser } from 'models/user';

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
  const { limit } = req.query;
  const session = await getSession(req, res);

  const rankings = await getRankingsByType(
    ScoreType.PLAYGROUND,
    limit ? parseInt(limit as string, 10) : 100
  );

  let userRanking: number | null = null;
  if (session?.user?.id) {
    const rank = await getUserRankingByType(
      session.user.id,
      ScoreType.PLAYGROUND
    );
    userRanking = rank;
  }

  res.status(200).json({
    data: {
      rankings,
      userRanking,
    },
  });
};
