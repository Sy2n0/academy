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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res
        .status(400)
        .json({ error: { message: 'Track ID is required' } });
    }

    // Track 정보 가져오기
    const skillPath = await prisma.skillPath.findUnique({
      where: {
        id,
        isActive: true,
      },
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

    if (!skillPath) {
      return res.status(404).json({ error: { message: 'Track not found' } });
    }

    // 사용자 등록 상태 확인
    let isEnrolled = false;
    let completedModuleIds: Set<string> = new Set();
    if (user) {
      const enrollment = await prisma.userSkillPathEnrollment.findUnique({
        where: {
          userId_skillPathId: {
            userId: user.id,
            skillPathId: id,
          },
        },
      });
      isEnrolled = !!enrollment;

      // 사용자가 완료한 모듈 목록 가져오기
      const completions = await prisma.userModuleCompletion.findMany({
        where: {
          userId: user.id,
          moduleId: {
            in: skillPath.modules.map((m) => m.moduleId),
          },
        },
        select: {
          moduleId: true,
        },
      });
      completedModuleIds = new Set(completions.map((c) => c.moduleId));
    }

    const track = {
      id: skillPath.id,
      title: skillPath.title,
      description: skillPath.description,
      type: skillPath.type,
      difficulty: skillPath.difficulty,
      duration: skillPath.duration,
      imageUrl: skillPath.imageUrl,
      moduleCount: skillPath.modules.length,
      isEnrolled,
      modules: skillPath.modules.map((spm) => ({
        id: spm.id,
        moduleId: spm.moduleId,
        order: spm.order,
        isCompleted: completedModuleIds.has(spm.moduleId),
        module: {
          id: spm.module.id,
          title: spm.module.title,
          description: spm.module.description,
          category: spm.module.category,
          difficulty: spm.module.difficulty,
          duration: spm.module.duration,
          tier: spm.module.tier,
          type: spm.module.type,
          imageUrl: spm.module.imageUrl,
          content: spm.module.content,
        },
      })),
    };

    res.status(200).json({
      data: track,
    });
  } catch (error: any) {
    console.error('[API /learn/tracks/[id]] Error:', error);
    res.status(500).json({
      error: { message: error.message || 'Failed to fetch track' },
    });
  }
}
