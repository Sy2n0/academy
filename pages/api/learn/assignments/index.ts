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

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const model = (prisma as any).learnAssignment;
    if (!model || typeof model.findMany !== 'function') {
      return res.status(200).json({ data: [] });
    }

    const allActive = await prisma.learnAssignment.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        submissions: {
          where: { userId: user.id },
          select: { id: true, submittedAt: true, attachmentUrl: true, content: true },
        },
      },
    });

    const [enrolledTrackIds, completedModuleIds] = await Promise.all([
      prisma.userSkillPathEnrollment
        .findMany({
          where: { userId: user.id },
          select: { skillPathId: true },
        })
        .then((rows) => rows.map((r) => r.skillPathId)),
      prisma.userModuleCompletion
        .findMany({
          where: { userId: user.id },
          select: { moduleId: true },
        })
        .then((rows) => rows.map((r) => r.moduleId)),
    ]);

    const eligible = allActive.filter((a) => {
      if (a.targetType === 'ALL') return true;
      if (a.targetType === 'TRACK' && a.targetId) return enrolledTrackIds.includes(a.targetId);
      if (a.targetType === 'MODULE' && a.targetId) return completedModuleIds.includes(a.targetId);
      return false;
    });

    const data = eligible.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueAt: a.dueAt,
      createdAt: a.createdAt,
      submitted: a.submissions.length > 0,
      submittedAt: a.submissions[0]?.submittedAt ?? null,
      attachmentUrl: a.submissions[0]?.attachmentUrl ?? null,
      submissionContent: a.submissions[0]?.content ?? null,
    }));

    return res.status(200).json({ data });
  } catch (e) {
    console.error('[API /learn/assignments]', e);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}
