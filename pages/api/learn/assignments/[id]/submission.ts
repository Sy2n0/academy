import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

/**
 * DELETE: 현재 사용자의 해당 과제 제출 삭제 (다시 제출 가능)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const assignmentId = req.query.id as string;
  if (!assignmentId) {
    return res.status(400).json({ error: { message: 'Assignment ID required' } });
  }

  const session = await getSession(req, res);
  const user = await getUserBySession(session);
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const existing = await prisma.learnAssignmentSubmission.findUnique({
    where: {
      assignmentId_userId: { assignmentId, userId: user.id },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: { message: 'No submission to delete' } });
  }

  await prisma.learnAssignmentSubmission.delete({
    where: { id: existing.id },
  });

  return res.status(200).json({ success: true });
}
