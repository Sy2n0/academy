import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { ApiError } from '@/lib/errors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) throw new ApiError(401, 'Unauthorized');
    if (!isAdmin(user.role)) throw new ApiError(403, 'Forbidden');

    const assignmentId = req.query.id as string;
    if (!assignmentId) throw new ApiError(400, 'Assignment ID required');

    const model = (prisma as any).learnAssignment;
    if (!model?.findUnique) {
      return res.status(200).json({ data: [] });
    }

    const assignment = await prisma.learnAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, title: true },
    });
    if (!assignment) throw new ApiError(404, 'Assignment not found');

    const submissions = await prisma.learnAssignmentSubmission.findMany({
      where: { assignmentId },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    const data = submissions.map((s) => ({
      id: s.id,
      content: s.content,
      attachmentUrl: s.attachmentUrl,
      submittedAt: s.submittedAt,
      user: s.user,
    }));

    return res.status(200).json({ data: { assignment, submissions: data } });
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      return res.status(e.status).json({ error: { message: e.message } });
    }
    console.error('[API /admin/learn/assignments/[id]/submissions]', e);
    return res
      .status(500)
      .json({ error: { message: 'Internal server error' } });
  }
}
