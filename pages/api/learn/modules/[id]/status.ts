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

    if (!user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: { message: 'Module ID is required' } });
    }

    // 완료 상태 확인
    const completion = await prisma.userModuleCompletion.findUnique({
      where: {
        userId_moduleId: {
          userId: user.id,
          moduleId: id,
        },
      },
    });

    res.status(200).json({
      data: {
        completed: !!completion,
        completedAt: completion?.completedAt || null,
      },
    });
  } catch (error: any) {
    console.error('[API /learn/modules/[id]/status] Error:', error);
    res.status(500).json({ 
      error: { message: error.message || 'Failed to fetch module status' }
    });
  }
}
