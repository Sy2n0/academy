import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
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

    const { moduleId } = req.query;

    if (!moduleId || typeof moduleId !== 'string') {
      throw new ApiError(400, 'Module ID is required');
    }

    switch (req.method) {
      case 'GET':
        return handleGET(req, res, user.id, moduleId);
      case 'POST':
      case 'PATCH':
        return handlePOST(req, res, user.id, moduleId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    console.error('[API /learn/modules/[id]/note] Error:', error);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  moduleId: string
) {
  const note = await prisma.userModuleNote.findUnique({
    where: {
      userId_moduleId: {
        userId,
        moduleId,
      },
    },
  });

  res.status(200).json({
    data: note || null,
  });
}

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  moduleId: string
) {
  const { content } = req.body;

  // 모듈이 존재하는지 확인
  const module = await prisma.learningModule.findUnique({
    where: { id: moduleId },
  });

  if (!module) {
    throw new ApiError(404, 'Module not found');
  }

  // 노트가 이미 존재하는지 확인
  const existingNote = await prisma.userModuleNote.findUnique({
    where: {
      userId_moduleId: {
        userId,
        moduleId,
      },
    },
  });

  let note;
  if (existingNote) {
    // 업데이트
    note = await prisma.userModuleNote.update({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
      data: {
        content: content || null,
      },
    });
  } else {
    // 생성
    note = await prisma.userModuleNote.create({
      data: {
        userId,
        moduleId,
        content: content || null,
      },
    });
  }

  res.status(200).json({
    data: note,
  });
}
