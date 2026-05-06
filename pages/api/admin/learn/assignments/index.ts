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
  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!isAdmin(user.role)) {
      throw new ApiError(403, 'Forbidden');
    }

    switch (req.method) {
      case 'GET':
        return handleGET(req, res);
      case 'POST':
        return handlePOST(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    console.error('[API /admin/learn/assignments] Error:', error);
    res.setHeader('Content-Type', 'application/json');
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: { message } });
  }
}

async function handleGET(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const model = (prisma as any).learnAssignment;
    if (!model || typeof model.findMany !== 'function') {
      console.warn('[API /admin/learn/assignments] learnAssignment not in Prisma client. Run: npx prisma generate && restart server');
      return res.status(200).json({ data: [], _warning: 'Prisma client outdated. Run "npx prisma generate" and restart the server to enable assignments.' });
    }
    const assignments = await prisma.learnAssignment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true } },
      },
    });
    return res.status(200).json({ data: assignments });
  } catch (dbError: unknown) {
    console.error('[API /admin/learn/assignments] handleGET error:', dbError);
    const message = dbError instanceof Error ? dbError.message : 'Database error';
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: { message } });
  }
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const model = (prisma as any).learnAssignment;
  if (!model || typeof model.create !== 'function') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({
      error: { message: 'Assignments model not loaded. Run "npx prisma generate" and restart the server.' },
    });
  }

  const body = req.body;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const dueAt = body.dueAt ? new Date(body.dueAt) : null;
  const targetType = typeof body.targetType === 'string' ? body.targetType : 'ALL';
  const targetId = typeof body.targetId === 'string' ? body.targetId.trim() || null : null;

  if (!title) {
    throw new ApiError(400, 'Title is required');
  }

  const validTargetTypes = ['ALL', 'TRACK', 'MODULE'];
  if (!validTargetTypes.includes(targetType)) {
    throw new ApiError(400, 'Invalid targetType');
  }

  if (targetType !== 'ALL' && !targetId) {
    throw new ApiError(400, 'targetId is required when targetType is TRACK or MODULE');
  }

  const assignment = await prisma.learnAssignment.create({
    data: {
      title,
      description,
      dueAt,
      targetType,
      targetId,
      isActive: true,
    },
  });

  res.status(201).json({ data: assignment });
}
