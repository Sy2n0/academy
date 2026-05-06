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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Module ID is required');
    }

    switch (req.method) {
      case 'GET':
        return handleGET(req, res, id);
      case 'PATCH':
        return handlePATCH(req, res, id);
      case 'DELETE':
        return handleDELETE(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    console.error('[API /admin/learn/modules/[id]] Error:', error);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse, id: string) {
  const module = await prisma.learningModule.findUnique({
    where: { id },
  });

  if (!module) {
    throw new ApiError(404, 'Module not found');
  }

  res.status(200).json({
    data: module,
  });
}

async function handlePATCH(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { title, description, content, category, difficulty, duration, tier, type, imageUrl, isActive } = req.body;

  const module = await prisma.learningModule.findUnique({
    where: { id },
  });

  if (!module) {
    throw new ApiError(404, 'Module not found');
  }

  const updatedModule = await prisma.learningModule.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(content !== undefined && { content: content?.trim() || null }),
      ...(category !== undefined && { category }),
      ...(difficulty !== undefined && { difficulty }),
      ...(duration !== undefined && { duration: duration || null }),
      ...(tier !== undefined && { tier }),
      ...(type !== undefined && { type }),
      ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.status(200).json({
    data: updatedModule,
  });
}

async function handleDELETE(req: NextApiRequest, res: NextApiResponse, id: string) {
  const module = await prisma.learningModule.findUnique({
    where: { id },
  });

  if (!module) {
    throw new ApiError(404, 'Module not found');
  }

  await prisma.learningModule.delete({
    where: { id },
  });

  res.status(200).json({
    data: { message: 'Module deleted successfully' },
  });
}
