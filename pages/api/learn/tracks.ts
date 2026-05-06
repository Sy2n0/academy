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

    const { type } = req.query; // 'OFFENSIVE', 'DEFENSIVE' or undefined (all)

    // 활성화된 Skill Path만 가져오기
    const where: any = {
      isActive: true,
    };

    if (type && typeof type === 'string') {
      where.type = type;
    }

    const skillPaths = await prisma.skillPath.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 사용자 등록 상태 가져오기
    let enrollments: Array<{ skillPathId: string }> = [];
    if (user) {
      enrollments = await prisma.userSkillPathEnrollment.findMany({
        where: {
          userId: user.id,
          skillPathId: {
            in: skillPaths.map(sp => sp.id),
          },
        },
        select: {
          skillPathId: true,
        },
      });
    }

    const enrollmentSet = new Set(enrollments.map(e => e.skillPathId));

    // 사용자가 완료한 모듈 목록 가져오기
    let completedModuleIds: Set<string> = new Set();
    if (user) {
      const allModuleIds = skillPaths.flatMap(sp => sp.modules.map(m => m.moduleId));
      const completions = await prisma.userModuleCompletion.findMany({
        where: {
          userId: user.id,
          moduleId: {
            in: allModuleIds,
          },
        },
        select: {
          moduleId: true,
        },
      });
      completedModuleIds = new Set(completions.map(c => c.moduleId));
    }

    // 응답 데이터 구성
    const tracksWithDetails = skillPaths.map((skillPath) => {
      const moduleCount = skillPath.modules.length;
      const isEnrolled = enrollmentSet.has(skillPath.id);
      
      // Track이 완료되었는지 확인 (모든 모듈이 완료되었는지)
      const allModulesCompleted = moduleCount > 0 && 
        skillPath.modules.every(spm => completedModuleIds.has(spm.moduleId));

      return {
        id: skillPath.id,
        title: skillPath.title,
        description: skillPath.description,
        type: skillPath.type,
        difficulty: skillPath.difficulty,
        duration: skillPath.duration,
        imageUrl: skillPath.imageUrl,
        moduleCount,
        isEnrolled,
        isCompleted: allModulesCompleted,
      };
    });

    res.status(200).json({
      data: tracksWithDetails,
    });
  } catch (error: any) {
    console.error('[API /learn/tracks] Error:', error);
    res.status(500).json({ 
      error: { message: error.message || 'Failed to fetch tracks' }
    });
  }
}
