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

    const id = req.query.id as string;
    if (!id) {
      throw new ApiError(400, 'Assignment ID required');
    }

    switch (req.method) {
      case 'GET':
        return handleGET(req, res, id);
      case 'PATCH':
        return handlePATCH(req, res, id);
      case 'DELETE':
        return handleDELETE(res, id);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    console.error('[API /admin/learn/assignments/[id]] Error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}

async function handleGET(_req: NextApiRequest, res: NextApiResponse, id: string) {
  const assignment = await prisma.learnAssignment.findUnique({
    where: { id },
    include: { _count: { select: { submissions: true } } },
  });

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  res.status(200).json({ data: assignment });
}

async function handlePATCH(req: NextApiRequest, res: NextApiResponse, id: string) {
  const body = req.body;
  const title = typeof body.title === 'string' ? body.title.trim() : undefined;
  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  const dueAt = body.dueAt !== undefined ? (body.dueAt ? new Date(body.dueAt) : null) : undefined;
  const targetType = typeof body.targetType === 'string' ? body.targetType : undefined;
  const targetId = body.targetId !== undefined ? (typeof body.targetId === 'string' ? body.targetId.trim() || null : null) : undefined;
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined;

  if (title !== undefined && !title) {
    throw new ApiError(400, 'Title cannot be empty');
  }

  const assignment = await prisma.learnAssignment.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dueAt !== undefined && { dueAt }),
      ...(targetType !== undefined && { targetType }),
      ...(targetId !== undefined && { targetId }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.status(200).json({ data: assignment });
}

async function handleDELETE(res: NextApiResponse, id: string) {
  await prisma.learnAssignment.delete({ where: { id } });
  res.status(204).end();
}
