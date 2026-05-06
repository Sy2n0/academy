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
      throw new ApiError(400, 'Track ID is required');
    }

    switch (req.method) {
      case 'GET':
        return handleGET(req, res, id);
      case 'POST':
        return handlePOST(req, res, id);
      case 'DELETE':
        return handleDELETE(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    console.error('[API /admin/learn/tracks/[id]/modules] Error:', error);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse, id: string) {
  const track = await prisma.skillPath.findUnique({
    where: { id },
    include: {
      modules: {
        include: {
          module: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!track) {
    throw new ApiError(404, 'Track not found');
  }

  res.status(200).json({
    data: track.modules.map((spm) => ({
      id: spm.id,
      moduleId: spm.moduleId,
      order: spm.order,
      module: {
        id: spm.module.id,
        title: spm.module.title,
        description: spm.module.description,
        category: spm.module.category,
        difficulty: spm.module.difficulty,
      },
    })),
  });
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { moduleId, order } = req.body;

  if (!moduleId || typeof moduleId !== 'string') {
    throw new ApiError(400, 'Module ID is required');
  }

  // Track이 존재하는지 확인
  const track = await prisma.skillPath.findUnique({
    where: { id },
  });

  if (!track) {
    throw new ApiError(404, 'Track not found');
  }

  // Module이 존재하는지 확인
  const module = await prisma.learningModule.findUnique({
    where: { id: moduleId },
  });

  if (!module) {
    throw new ApiError(404, 'Module not found');
  }

  // 이미 연결되어 있는지 확인
  const existing = await prisma.skillPathModule.findUnique({
    where: {
      skillPathId_moduleId: {
        skillPathId: id,
        moduleId: moduleId,
      },
    },
  });

  if (existing) {
    throw new ApiError(400, 'Module is already added to this track');
  }

  // 최대 order 값 가져오기
  const maxOrder = await prisma.skillPathModule.findFirst({
    where: { skillPathId: id },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const newOrder = order !== undefined ? order : (maxOrder?.order ?? -1) + 1;

  const skillPathModule = await prisma.skillPathModule.create({
    data: {
      skillPathId: id,
      moduleId: moduleId,
      order: newOrder,
    },
    include: {
      module: true,
    },
  });

  res.status(201).json({
    data: skillPathModule,
  });
}

async function handleDELETE(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { moduleId } = req.query;

  if (!moduleId || typeof moduleId !== 'string') {
    throw new ApiError(400, 'Module ID is required');
  }

  await prisma.skillPathModule.delete({
    where: {
      skillPathId_moduleId: {
        skillPathId: id,
        moduleId: moduleId,
      },
    },
  });

  res.status(200).json({
    data: { message: 'Module removed from track successfully' },
  });
}
