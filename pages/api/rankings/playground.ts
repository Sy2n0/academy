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
  const { limit, season } = req.query;
  const session = await getSession(req, res);

  // Each season starts from zero, so a ranking is only meaningful once it is
  // told which one. Omitting `season` still sums every season, which is what
  // the all-time board wants.
  const seasonCodeName = typeof season === 'string' ? season : undefined;

  const rankings = await getRankingsByType(
    ScoreType.PLAYGROUND,
    limit ? parseInt(limit as string, 10) : 100,
    seasonCodeName
  );

  let userRanking: number | null = null;
  if (session?.user?.id) {
    const rank = await getUserRankingByType(
      session.user.id,
      ScoreType.PLAYGROUND,
      seasonCodeName
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
