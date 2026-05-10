import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

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

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }

    const { id } = req.query;
    const run = await prisma.testRun.findUnique({
      where: { id: id as string },
    });

    if (!run) {
      throw new ApiError(404, 'Test run not found');
    }

    res.status(200).json({ data: run });
  } catch (error: any) {
    res.status(error.status ?? 500).json({ error: { message: error.message ?? 'Something went wrong' } });
  }
}
