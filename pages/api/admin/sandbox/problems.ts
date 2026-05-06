import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createSchema = z.object({
  title: z.string().min(1, '제목 필수'),
  description: z.string().optional(),
  category: z.string().min(1, '카테고리 필수'),
  dockerImage: z.string().optional(),
  containerPort: z.number().int().min(1).max(65535).optional(),
  flag: z.string().optional(),
  positionX: z.number().min(0).max(1),
  positionY: z.number().min(0).max(1),
  orderIndex: z.number().int().optional(),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const user = await getUserBySession(session);
    if (!user || !isAdmin(user.role)) {
      throw new ApiError(403, 'Admin only');
    }

    switch (req.method) {
      case 'GET':
        return await handleGET(req, res);
      case 'POST':
        return await handlePOST(req, res);
      case 'PUT':
        return await handlePUT(req, res);
      case 'DELETE':
        return await handleDELETE(req, res);
      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        return res.status(405).json({ error: { message: 'Method Not Allowed' } });
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    const status = err.status ?? 500;
    const message = err.message ?? 'Something went wrong';
    return res.status(status).json({ error: { message } });
  }
}

async function handleGET(_req: NextApiRequest, res: NextApiResponse) {
  const list = await prisma.sandboxProblem.findMany({
    orderBy: [{ category: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
  });
  return res.json({ data: list });
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const body = createSchema.parse(req.body);
  const sameCategory = await prisma.sandboxProblem.findMany({
    where: { category: body.category },
    select: { orderIndex: true },
    orderBy: { orderIndex: 'desc' },
    take: 1,
  });
  const maxOrder = sameCategory[0]?.orderIndex ?? -1;

  const created = await prisma.sandboxProblem.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      category: body.category,
      dockerImage: body.dockerImage?.trim() || null,
      containerPort: body.containerPort ?? 7681,
      flag: body.flag?.trim() || null,
      positionX: body.positionX,
      positionY: body.positionY,
      orderIndex: body.orderIndex ?? maxOrder + 1,
      isActive: true,
    },
  });
  return res.status(201).json({ data: created });
}

async function handlePUT(req: NextApiRequest, res: NextApiResponse) {
  const body = updateSchema.parse(req.body);
  const updated = await prisma.sandboxProblem.update({
    where: { id: body.id },
    data: {
      title: body.title,
      description: body.description ?? null,
      category: body.category,
      dockerImage: body.dockerImage?.trim() || null,
      containerPort: body.containerPort ?? 7681,
      flag: body.flag?.trim() || null,
      positionX: body.positionX,
      positionY: body.positionY,
      orderIndex: body.orderIndex ?? 0,
    },
  });
  return res.json({ data: updated });
}

async function handleDELETE(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : (req.body as { id?: string } | undefined)?.id;
  const { id: targetId } = deleteSchema.parse({ id: id ?? '' });
  await prisma.sandboxProblem.delete({ where: { id: targetId } });
  return res.json({ data: { id: targetId } });
}
