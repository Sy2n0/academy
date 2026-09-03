import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * The module's exercises with this learner's progress folded in.
 *
 * checkCommand is deliberately not selected: it describes exactly what the
 * grader looks for, which for most exercises is the answer.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res
        .status(405)
        .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }

    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) throw new ApiError(401, 'Unauthorized');

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Module ID is required');
    }

    const exercises = await prisma.moduleExercise.findMany({
      where: { moduleId: id },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        order: true,
        title: true,
        checks: { where: { userId: user.id }, select: { passedAt: true } },
      },
    });

    return res.json({
      data: {
        exercises: exercises.map(({ checks, ...rest }) => ({
          ...rest,
          passed: checks.length > 0,
        })),
      },
    });
  } catch (error: any) {
    const status = error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
