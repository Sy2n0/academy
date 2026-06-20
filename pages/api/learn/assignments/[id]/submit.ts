import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    res.setHeader('Allow', ['POST', 'PATCH']);
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const assignmentId = req.query.id as string;
  if (!assignmentId) {
    return res
      .status(400)
      .json({ error: { message: 'Assignment ID required' } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const model = (prisma as any).learnAssignment;
    if (!model || typeof model.findUnique !== 'function') {
      return res
        .status(503)
        .json({ error: { message: 'Assignments not available' } });
    }

    const assignment = await prisma.learnAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || !assignment.isActive) {
      return res
        .status(404)
        .json({ error: { message: 'Assignment not found' } });
    }

    const [enrolledTrackIds, completedModuleIds] = await Promise.all([
      prisma.userSkillPathEnrollment
        .findMany({ where: { userId: user.id }, select: { skillPathId: true } })
        .then((rows) => rows.map((r) => r.skillPathId)),
      prisma.userModuleCompletion
        .findMany({ where: { userId: user.id }, select: { moduleId: true } })
        .then((rows) => rows.map((r) => r.moduleId)),
    ]);

    const eligible =
      assignment.targetType === 'ALL' ||
      (assignment.targetType === 'TRACK' &&
        assignment.targetId &&
        enrolledTrackIds.includes(assignment.targetId)) ||
      (assignment.targetType === 'MODULE' &&
        assignment.targetId &&
        completedModuleIds.includes(assignment.targetId));

    if (!eligible) {
      return res.status(403).json({
        error: { message: 'You are not eligible to submit this assignment' },
      });
    }

    const body = req.body ?? {};
    const content =
      typeof body.content === 'string' ? body.content.trim() || null : null;
    const attachmentUrl =
      typeof body.attachmentUrl === 'string'
        ? body.attachmentUrl.trim() || null
        : null;

    const existing = await prisma.learnAssignmentSubmission.findUnique({
      where: {
        assignmentId_userId: { assignmentId, userId: user.id },
      },
    });

    if (req.method === 'PATCH') {
      if (!existing) {
        return res
          .status(404)
          .json({ error: { message: 'No submission to update' } });
      }
      const submission = await prisma.learnAssignmentSubmission.update({
        where: { id: existing.id },
        data: { content, attachmentUrl },
      });
      return res.status(200).json({ data: submission });
    }

    if (existing) {
      return res.status(409).json({ error: { message: 'Already submitted' } });
    }

    const submission = await prisma.learnAssignmentSubmission.create({
      data: {
        assignmentId,
        userId: user.id,
        content,
        attachmentUrl,
      },
    });

    return res.status(201).json({ data: submission });
  } catch (e) {
    console.error('[API /learn/assignments/[id]/submit]', e);
    return res
      .status(500)
      .json({ error: { message: 'Internal server error' } });
  }
}
