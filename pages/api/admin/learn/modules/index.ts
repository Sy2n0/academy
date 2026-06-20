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
  } catch (error: any) {
    if (error instanceof ApiError) {
      return res
        .status(error.status)
        .json({ error: { message: error.message } });
    }
    console.error('[API /admin/learn/modules] Error:', error);
    return res
      .status(500)
      .json({ error: { message: 'Internal server error' } });
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const modules = await prisma.learningModule.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.status(200).json({
    data: modules,
  });
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const {
    title,
    description,
    content,
    category,
    difficulty,
    duration,
    tier,
    type,
    imageUrl,
  } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  const module = await prisma.learningModule.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      content: content?.trim() || null,
      category: category || 'GENERAL',
      difficulty: difficulty || 'Fundamental',
      duration: duration || null,
      tier: tier || 'Tier 0',
      type: type || 'REGULAR',
      imageUrl: imageUrl || null,
      isActive: true,
    },
  });

  res.status(201).json({
    data: module,
  });
}
