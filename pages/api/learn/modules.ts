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

    // 활성화된 모듈만 가져오기
    const modules = await prisma.learningModule.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 사용자 완료 상태 가져오기
    let completions: Array<{ moduleId: string; completedAt: Date }> = [];
    if (user) {
      completions = await prisma.userModuleCompletion.findMany({
        where: {
          userId: user.id,
          moduleId: {
            in: modules.map(m => m.id),
          },
        },
        select: {
          moduleId: true,
          completedAt: true,
        },
      });
    }

    const completionMap = new Map(
      completions.map(c => [c.moduleId, c.completedAt])
    );

    // 사용자 진행 상황 포함
    const modulesWithProgress = modules.map((module) => {
      const completedAt = completionMap.get(module.id);
      const isCompleted = !!completedAt;

      return {
        id: module.id,
        title: module.title,
        image: module.imageUrl || '/api/placeholder/400/200',
        type: module.type as 'REGULAR' | 'PREMIUM',
        category: module.category as 'GENERAL' | 'OFFENSIVE' | 'DEFENSIVE',
        difficulty: module.difficulty as 'Fundamental' | 'Easy' | 'Medium' | 'Hard',
        duration: module.duration || 'N/A',
        tier: module.tier,
        progress: isCompleted ? 100 : undefined,
        status: isCompleted ? 'Completed' as const : undefined as 'In Progress' | 'Completed' | 'Not Started' | undefined,
        isCompleted,
        isFavourite: false, // TODO: 즐겨찾기 기능 추가
      };
    });

    res.status(200).json({
      data: modulesWithProgress,
    });
  } catch (error: any) {
    console.error('[API /learn/modules] Error:', error);
    res.status(500).json({ 
      error: { message: error.message || 'Failed to fetch modules' }
    });
  }
}
