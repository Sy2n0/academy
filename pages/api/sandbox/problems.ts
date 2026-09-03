import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { calculateDynamicValue } from '@/lib/ranks';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  // Explicit select. A bare findMany returns every scalar on the model, which
  // put `flag` — the answer to each problem — into a response any signed-in
  // user could read.
  const list = await prisma.sandboxProblem.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      positionX: true,
      positionY: true,
      orderIndex: true,
      containerPort: true,
      dockerImage: true,
      initialValue: true,
      minimumValue: true,
      decay: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { solves: true } },
    },
  });

  return res.json({
    data: list.map(({ _count, ...p }) => ({
      ...p,
      solveCount: _count.solves,
      // What the next person to solve it would earn.
      currentValue: calculateDynamicValue(
        p.initialValue,
        p.minimumValue,
        p.decay,
        _count.solves
      ),
    })),
  });
}
