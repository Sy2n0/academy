import type { NextApiRequest, NextApiResponse } from 'next';
import { getSandboxRankings } from 'models/score';
import { getSession } from '@/lib/session';

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

  const { rankings, totalProblems, categoryTotals } = await getSandboxRankings(
    limit ? parseInt(limit as string, 10) : 100
  );

  // The board is already sorted, so the viewer's position is just their index.
  const idx = session?.user?.id
    ? rankings.findIndex((r) => r.id === session.user.id)
    : -1;

  res.status(200).json({
    data: {
      rankings,
      totalProblems,
      categoryTotals,
      userRanking: idx >= 0 ? idx + 1 : null,
    },
  });
};
