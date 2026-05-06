import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);

    if (!user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: { message: 'Module ID is required' } });
    }

    // 모듈이 존재하고 활성화되어 있는지 확인
    const module = await prisma.learningModule.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!module) {
      return res.status(404).json({ error: { message: 'Module not found' } });
    }

    // 이미 완료했는지 확인
    const existingCompletion = await prisma.userModuleCompletion.findUnique({
      where: {
        userId_moduleId: {
          userId: user.id,
          moduleId: id,
        },
      },
    });

    if (existingCompletion) {
      return res.status(200).json({
        data: {
          message: 'Module already completed',
          completed: true,
          completedAt: existingCompletion.completedAt,
        },
      });
    }

    // 완료 상태 생성
    const completion = await prisma.userModuleCompletion.create({
      data: {
        userId: user.id,
        moduleId: id,
      },
    });

    res.status(200).json({
      data: {
        message: 'Module completed successfully',
        completed: true,
        completedAt: completion.completedAt,
      },
    });
  } catch (error: any) {
    console.error('[API /learn/modules/[id]/complete] Error:', error);
    res.status(500).json({ 
      error: { message: error.message || 'Failed to complete module' }
    });
  }
}
