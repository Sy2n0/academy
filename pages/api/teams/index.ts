import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { createTeam, getUserTeams } from 'models/team';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  slug: z.string().min(1, 'Team slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  inviteCode: z.string().optional(),
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

    switch (req.method) {
      case 'GET':
        await handleGET(req, res, currentUser.id);
        break;
      case 'POST':
        await handlePOST(req, res, currentUser.id);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
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

// 사용자의 팀 목록 가져오기
const handleGET = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const teams = await getUserTeams(userId);

  res.json({
    data: { teams },
  });
};

// 팀 생성
const handlePOST = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { name, slug, inviteCode } = createTeamSchema.parse(req.body);

  const team = await createTeam(name, slug, userId, inviteCode);

  res.json({
    data: {
      message: 'Team created successfully',
      team,
    },
  });
};
