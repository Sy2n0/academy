import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ensureBadgeInfrastructure } from '@/lib/badges';
import { randomUUID } from 'crypto';

const createBadgeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

const updateBadgeSchema = createBadgeSchema.extend({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) throw new ApiError(401, 'Unauthorized');
    if (!isAdmin(currentUser.role))
      throw new ApiError(403, 'Only admins can manage badges');

    await ensureBadgeInfrastructure();

    switch (req.method) {
      case 'GET':
        await handleGET(res);
        break;
      case 'POST':
        await handlePOST(req, res);
        break;
      case 'PUT':
        await handlePUT(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        res
          .status(405)
          .json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

const handleGET = async (res: NextApiResponse) => {
  const badges = await prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT "id", "slug", "name", "description", "imageUrl", "isActive", "createdAt", "updatedAt"
    FROM "BadgeCatalog"
    ORDER BY "updatedAt" DESC
  `;

  res.json({
    data: badges.map((badge) => ({
      ...badge,
      createdAt: badge.createdAt.toISOString(),
      updatedAt: badge.updatedAt.toISOString(),
    })),
  });
};

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const parsed = createBadgeSchema.parse(req.body);
  const slug = slugify(parsed.slug || parsed.name);

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "BadgeCatalog" WHERE "slug" = ${slug} LIMIT 1
  `;
  if (existing.length > 0) throw new ApiError(409, 'Badge slug already exists');

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "BadgeCatalog" ("id", "slug", "name", "description", "imageUrl", "isActive")
    VALUES (${id}, ${slug}, ${parsed.name}, ${parsed.description || null}, ${parsed.imageUrl || null}, true)
  `;

  res.json({ data: { id, slug, message: 'Badge created' } });
};

const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const parsed = updateBadgeSchema.parse(req.body);
  const slug = slugify(parsed.slug || parsed.name);

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "BadgeCatalog" WHERE "slug" = ${slug} AND "id" != ${parsed.id} LIMIT 1
  `;
  if (existing.length > 0) throw new ApiError(409, 'Badge slug already exists');

  await prisma.$executeRaw`
    UPDATE "BadgeCatalog"
    SET
      "slug" = ${slug},
      "name" = ${parsed.name},
      "description" = ${parsed.description || null},
      "imageUrl" = ${parsed.imageUrl || null},
      "isActive" = COALESCE(${parsed.isActive}, "isActive"),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${parsed.id}
  `;

  res.json({ data: { id: parsed.id, message: 'Badge updated' } });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const id = (
    typeof req.query.id === 'string' ? req.query.id : req.body?.id
  ) as string | undefined;
  if (!id) throw new ApiError(400, 'Badge id is required');

  await prisma.$executeRaw`DELETE FROM "BadgeCatalog" WHERE "id" = ${id}`;

  res.json({ data: { id, message: 'Badge deleted' } });
};
