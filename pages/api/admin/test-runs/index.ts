import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { startTestRun } from '@/lib/test-runner';

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
      throw new ApiError(403, 'Admin only');
    }

    switch (req.method) {
      case 'GET':
        return await handleGET(req, res);
      case 'POST':
        return await handlePOST(req, res);
      default:
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
  } catch (error: any) {
    res.status(error.status ?? 500).json({ error: { message: error.message ?? 'Something went wrong' } });
  }
}

const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100);
  const page = Math.max(parseInt((req.query.page as string) ?? '1', 10), 1);
  const skip = (page - 1) * limit;

  const [runs, total] = await Promise.all([
    prisma.testRun.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        trigger: true,
        commit: true,
        branch: true,
        passedCount: true,
        failedCount: true,
        skipCount: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.testRun.count(),
  ]);

  res.status(200).json({ data: { runs, total, page, limit } });
};

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { trigger, commit, branch, testPattern } = req.body ?? {};

  const runId = await startTestRun({
    trigger: trigger ?? 'api',
    commit,
    branch,
    testPattern,
  });

  res.status(202).json({ data: { id: runId } });
};
