import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { getRankings } from 'models/score';

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
      throw new ApiError(403, 'Only admins can export scoreboard');
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({
        error: { message: `Method ${req.method} Not Allowed` },
      });
      return;
    }

    const { format } = req.query;
    const rankings = await getRankings(1000); // 최대 1000명

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=scoreboard.json'
      );
      res.json({ rankings, exportedAt: new Date().toISOString() });
    } else if (format === 'csv') {
      // CSV 형식
      const csvHeader =
        'Rank,Name,Email,Machine Points,Track Points,Playground Points,Total Points\n';
      const csvRows = rankings
        .map(
          (user, index) =>
            `${index + 1},"${user.name}","${user.email}",${user.machinePoints || 0},${user.trackPoints || 0},${user.playgroundPoints || 0},${user.totalPoints || 0}`
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=scoreboard.csv'
      );
      res.send(csvHeader + csvRows);
    } else {
      // 기본 JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=scoreboard.json'
      );
      res.json({ rankings, exportedAt: new Date().toISOString() });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}
