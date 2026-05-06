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
      return res.status(error.status).json({ error: { message: error.message } });
    }
    console.error('[API /admin/learn/tracks] Error:', error);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const tracks = await prisma.skillPath.findMany({
    include: {
      modules: {
        include: {
          module: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const tracksWithModuleCount = tracks.map((track) => ({
    id: track.id,
    title: track.title,
    description: track.description,
    type: track.type,
    difficulty: track.difficulty,
    duration: track.duration,
    imageUrl: track.imageUrl,
    isActive: track.isActive,
    moduleCount: track.modules.length,
    enrollmentCount: track._count.enrollments,
    createdAt: track.createdAt.toISOString(),
    updatedAt: track.updatedAt.toISOString(),
  }));

  res.status(200).json({
    data: tracksWithModuleCount,
  });
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { title, description, type, difficulty, duration, imageUrl } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  const track = await prisma.skillPath.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      type: type || 'Binary Exploitation',
      difficulty: difficulty || 'Easy',
      duration: duration || null,
      imageUrl: imageUrl || null,
      isActive: true,
    },
  });

  res.status(201).json({
    data: track,
  });
}
