import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const challengeCreateSchema = z.object({
  playgroundCodeName: z.string().min(1, 'Playground codeName is required'),
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.string().min(1, 'Difficulty is required'),
  value: z.number().int().positive('Value must be greater than 0'),
  flagType: z.string().min(1, 'Flag type is required'),
  flag: z.string().min(1, 'Flag is required'),
  description: z.string().optional(),
  serverAddress: z.string().trim().max(255).nullable().optional(),
  serverPort: z.number().int().min(1).max(65535).nullable().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        key: z.string().optional(),
        url: z.string().optional(),
        scope: z.enum(['public', 'programming_answer']).optional(),
      })
    )
    .optional(),
});

const challengeUpdateSchema = challengeCreateSchema.extend({
  id: z.string().min(1, 'Challenge id is required'),
});

const challengeDeleteSchema = z.object({
  id: z.string().min(1, 'Challenge id is required'),
});

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

    if (!isAdmin(currentUser.role)) {
      throw new ApiError(403, 'Only admins can manage playground challenges');
    }

    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
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

const normalize = (value: string) => value.trim().toLowerCase();

type ParsedAttachment = {
  name: string;
  size: number;
  type: string;
  key?: string;
  url?: string;
  scope?: 'public' | 'programming_answer';
};

type AttachmentScope = ParsedAttachment['scope'];

const normalizeCategory = (value: string) => value.trim().toLowerCase();

const buildAttachmentsPayload = (
  category: string,
  attachments: ParsedAttachment[] | undefined
): ParsedAttachment[] => {
  const normalizedCategory = normalizeCategory(category);
  const isProgramming = normalizedCategory === 'programming';
  const normalizedAttachments: ParsedAttachment[] = (attachments || []).map(
    (item) => {
      const scope: AttachmentScope =
        item.scope === 'programming_answer' ? 'programming_answer' : 'public';
      return {
        ...item,
        scope,
      };
    }
  );

  const publicAttachments = normalizedAttachments.filter(
    (item) => item.scope !== 'programming_answer'
  );
  const answerAttachment = normalizedAttachments.find(
    (item) => item.scope === 'programming_answer'
  );

  if (!isProgramming) {
    return publicAttachments;
  }

  return answerAttachment
    ? [...publicAttachments, answerAttachment]
    : publicAttachments;
};

const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const codeNameParam =
    typeof req.query.codeName === 'string' ? req.query.codeName : '';

  const where = codeNameParam
    ? {
        playgroundCodeName: normalize(codeNameParam),
      }
    : {};

  const items = await prisma.playgroundChallenge.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    data: items,
  });
};

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const payload = challengeCreateSchema.parse(req.body);
  const attachmentsPayload = buildAttachmentsPayload(
    payload.category,
    payload.attachments as ParsedAttachment[] | undefined
  );

  const challenge = await prisma.playgroundChallenge.create({
    data: {
      playgroundCodeName: normalize(payload.playgroundCodeName),
      title: payload.title,
      category: payload.category,
      difficulty: payload.difficulty,
      value: payload.value,
      flagType: payload.flagType,
      flag: payload.flag,
      description: payload.description || null,
      serverAddress: payload.serverAddress?.trim() || null,
      serverPort: payload.serverPort ?? null,
      attachments: attachmentsPayload.length
        ? (attachmentsPayload as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      isActive: true,
    },
  });

  res.status(201).json({
    data: challenge,
  });
};

const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const payload = challengeUpdateSchema.parse(req.body);
  const attachmentsPayload = buildAttachmentsPayload(
    payload.category,
    payload.attachments as ParsedAttachment[] | undefined
  );

  const challenge = await prisma.playgroundChallenge.update({
    where: { id: payload.id },
    data: {
      playgroundCodeName: normalize(payload.playgroundCodeName),
      title: payload.title,
      category: payload.category,
      difficulty: payload.difficulty,
      value: payload.value,
      flagType: payload.flagType,
      flag: payload.flag,
      description: payload.description || null,
      serverAddress: payload.serverAddress?.trim() || null,
      serverPort: payload.serverPort ?? null,
      attachments: attachmentsPayload.length
        ? (attachmentsPayload as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  res.json({
    data: challenge,
  });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const payload = challengeDeleteSchema.parse(req.body || {});

  await prisma.playgroundChallenge.delete({
    where: { id: payload.id },
  });

  res.json({
    data: { id: payload.id },
  });
};
