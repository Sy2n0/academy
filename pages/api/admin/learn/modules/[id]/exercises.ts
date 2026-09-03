import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const exerciseSchema = z.object({
  id: z.string().uuid().optional(),
  order: z.number().int().min(1).max(99),
  title: z.string().min(1).max(200),
  checkCommand: z.string().min(1).max(2000),
  hint: z.string().max(500).nullable().optional(),
});

/**
 * Manages a module's exercise checks.
 *
 * PUT replaces the whole list, because ordering is part of the content: sending
 * the set the admin sees avoids the reorder-and-patch dance, and any row that
 * disappears from the payload is one they deleted.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user) throw new ApiError(401, 'Unauthorized');
    if (!isAdmin(user.role)) throw new ApiError(403, 'Admin only');

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Module ID is required');
    }

    if (req.method === 'GET') {
      const exercises = await prisma.moduleExercise.findMany({
        where: { moduleId: id },
        orderBy: { order: 'asc' },
      });
      return res.json({ data: { exercises } });
    }

    if (req.method === 'PUT') {
      const { exercises } = z
        .object({ exercises: z.array(exerciseSchema).max(20) })
        .parse(req.body);

      const orders = exercises.map((e) => e.order);
      if (new Set(orders).size !== orders.length) {
        throw new ApiError(400, '순서가 중복됩니다');
      }

      // Replaced in one transaction: a partial write would leave the module
      // with a mix of old and new checks and no way to tell which is which.
      await prisma.$transaction([
        prisma.moduleExercise.deleteMany({
          where: {
            moduleId: id,
            ...(exercises.some((e) => e.id)
              ? {
                  id: {
                    notIn: exercises.filter((e) => e.id).map((e) => e.id!),
                  },
                }
              : {}),
          },
        }),
        ...exercises.map((e) =>
          prisma.moduleExercise.upsert({
            where: { moduleId_order: { moduleId: id, order: e.order } },
            create: {
              moduleId: id,
              order: e.order,
              title: e.title,
              checkCommand: e.checkCommand,
              hint: e.hint || null,
            },
            update: {
              title: e.title,
              checkCommand: e.checkCommand,
              hint: e.hint || null,
            },
          })
        ),
      ]);

      const saved = await prisma.moduleExercise.findMany({
        where: { moduleId: id },
        orderBy: { order: 'asc' },
      });
      return res.json({ data: { exercises: saved } });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res
      .status(405)
      .json({ error: { message: `Method ${req.method} Not Allowed` } });
  } catch (error: any) {
    const status = error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
