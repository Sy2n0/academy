import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const playgroundSettingsSchema = z.object({
  name: z.string().min(1, 'Playground name is required'),
  codeName: z.string().min(1, 'Code name is required'),
  badgeName: z.string().optional(),
  badgeImage: z.string().optional(),
  badgeDescription: z.string().optional(),
  season: z.string().min(1, 'Season is required'),
  type: z.enum(['beta', 'recruiting', 'regular', 'special']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

const playgroundSettingsUpdateSchema = playgroundSettingsSchema.extend({
  id: z.string().optional(),
});

const ensureBadgeColumns = async () => {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PlaygroundSettings"
    ADD COLUMN IF NOT EXISTS "badgeName" TEXT,
    ADD COLUMN IF NOT EXISTS "badgeImage" TEXT,
    ADD COLUMN IF NOT EXISTS "badgeDescription" TEXT;
  `);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession(req, res);
    const currentUser = await getUserBySession(session);

    if (!currentUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    // 관리자만 접근 가능
    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can manage playground settings');
    }

    await ensureBadgeColumns();

    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'PUT':
        await handlePUT(req, res);
        break;
      case 'PATCH':
        await handlePATCH(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, PUT, PATCH');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

// Get playground settings
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { list } = req.query;

  // 리스트 요청인 경우
  if (list === 'true') {
    const allSettings = await prisma.playgroundSettings.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({
      data: allSettings.map((settings) => ({
        id: settings.id,
        name: settings.name,
        codeName: settings.codeName,
        badgeName: settings.badgeName || '',
        badgeImage: settings.badgeImage || '',
        badgeDescription: settings.badgeDescription || '',
        season: settings.season,
        type: settings.type,
        startDate: settings.startDate || '',
        endDate: settings.endDate || '',
        description: settings.description || '',
        isActive: settings.isActive,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      })),
    });
    return;
  }

  // 활성 설정을 가져오기 (없으면 가장 최근 설정)
  const settings =
    (await prisma.playgroundSettings.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })) ||
    (await prisma.playgroundSettings.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    }));

  if (!settings) {
    // 설정이 없으면 기본값 반환
    res.json({
      data: {
        name: '',
        codeName: '',
        badgeName: '',
        badgeImage: '',
        badgeDescription: '',
        season: '',
        type: '',
        startDate: '',
        endDate: '',
        description: '',
      },
    });
    return;
  }

  res.json({
    data: {
      name: settings.name,
      codeName: settings.codeName,
      badgeName: settings.badgeName || '',
      badgeImage: settings.badgeImage || '',
      badgeDescription: settings.badgeDescription || '',
      season: settings.season,
      type: settings.type,
      startDate: settings.startDate || '',
      endDate: settings.endDate || '',
      description: settings.description || '',
    },
  });
};

// Update playground settings
const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const validatedData = playgroundSettingsUpdateSchema.parse(req.body);

    // Prisma 클라이언트 확인
    if (!prisma) {
      throw new ApiError(500, 'Prisma client is not initialized');
    }

    if (!prisma.playgroundSettings) {
      throw new ApiError(
        500,
        'PlaygroundSettings model is not available. Please restart the server.'
      );
    }

    let settings;

    if (validatedData.id) {
      settings = await prisma.playgroundSettings.update({
        where: { id: validatedData.id },
        data: {
          name: validatedData.name,
          codeName: validatedData.codeName,
          badgeName: validatedData.badgeName || null,
          badgeImage: validatedData.badgeImage || null,
          badgeDescription: validatedData.badgeDescription || null,
          season: validatedData.season,
          type: validatedData.type,
          startDate: validatedData.startDate || null,
          endDate: validatedData.endDate || null,
          description: validatedData.description || null,
        },
      });
    } else {
      console.log('Creating playground settings with data:', validatedData);

      await prisma.playgroundSettings.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      settings = await prisma.playgroundSettings.create({
        data: {
          name: validatedData.name,
          codeName: validatedData.codeName,
          badgeName: validatedData.badgeName || null,
          badgeImage: validatedData.badgeImage || null,
          badgeDescription: validatedData.badgeDescription || null,
          season: validatedData.season,
          type: validatedData.type,
          startDate: validatedData.startDate || null,
          endDate: validatedData.endDate || null,
          description: validatedData.description || null,
          isActive: true,
        },
      });
    }

    res.json({
      data: {
        message: validatedData.id
          ? 'Playground settings edited successfully'
          : 'Playground settings updated successfully',
        id: settings.id,
        name: settings.name,
        codeName: settings.codeName,
        badgeName: settings.badgeName || '',
        badgeImage: settings.badgeImage || '',
        badgeDescription: settings.badgeDescription || '',
        season: settings.season,
        type: settings.type,
        startDate: settings.startDate || '',
        endDate: settings.endDate || '',
        description: settings.description || '',
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error in handlePUT:', error);

    // Zod validation error
    if (error.name === 'ZodError') {
      const errorMessages = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ApiError(400, `Validation error: ${errorMessages}`);
    }

    // Prisma error
    if (error.code === 'P2002') {
      throw new ApiError(
        409,
        'A setting with this configuration already exists'
      );
    }

    throw error;
  }
};

// Set a specific setting as active
const handlePATCH = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.body;

    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Setting ID is required');
    }

    // 기존 active 설정을 모두 비활성화
    await prisma.playgroundSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // 선택한 설정을 active로 설정
    const settings = await prisma.playgroundSettings.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({
      data: {
        message: 'Settings activated successfully',
        id: settings.id,
        name: settings.name,
        codeName: settings.codeName,
        badgeName: settings.badgeName || '',
        badgeImage: settings.badgeImage || '',
        badgeDescription: settings.badgeDescription || '',
        season: settings.season,
        type: settings.type,
        startDate: settings.startDate || '',
        endDate: settings.endDate || '',
        description: settings.description || '',
        isActive: settings.isActive,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error in handlePATCH:', error);

    // Prisma error
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Setting not found');
    }

    throw error;
  }
};
