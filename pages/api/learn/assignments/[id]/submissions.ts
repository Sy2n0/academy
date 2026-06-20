import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const assignmentId = req.query.id as string;
  if (!assignmentId) {
    return res
      .status(400)
      .json({ error: { message: 'Assignment ID required' } });
  }

  const session = await getSession(req, res);
  const user = await getUserBySession(session);
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  try {
    const submissions = await prisma.learnAssignmentSubmission.findMany({
      where: { assignmentId },
      select: {
        submittedAt: true,
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return res.status(200).json({
      data: submissions.map((s) => ({
        userId: s.user.id,
        name: s.user.name,
        image: s.user.image ?? null,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (e) {
    console.error('[API /learn/assignments/[id]/submissions]', e);
    return res
      .status(500)
      .json({ error: { message: 'Internal server error' } });
  }
}
