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
        .json({ error: { message: 'Module ID is required' } });
    }

    // 활성화된 모듈만 가져오기
    const module = await prisma.learningModule.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        duration: true,
        tier: true,
        type: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        content: true,
      },
    });

    if (!module) {
      return res.status(404).json({ error: { message: 'Module not found' } });
    }

    res.status(200).json({
      data: module,
    });
  } catch (error: any) {
    console.error('[API /learn/modules/[id]] Error:', error);
    res.status(500).json({
      error: { message: error.message || 'Failed to fetch module' },
    });
  }
}
