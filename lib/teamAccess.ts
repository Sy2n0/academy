import type { NextApiRequest, NextApiResponse } from 'next';

import { ApiError } from '@/lib/errors';
import { getSession } from '@/lib/session';
import { getTeamMember } from 'models/team';

/**
 * 요청에서 팀 슬러그와 세션으로 팀 멤버를 조회하고, 없으면 401 throw.
 * API 라우트에서 팀 접근 권한 검사용.
 */
export async function throwIfNoTeamAccess(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  const slug = req.query.slug as string | undefined;
  if (!session?.user?.id || !slug) {
    throw new ApiError(401, 'Unauthorized');
  }
  const teamMember = await getTeamMember(session.user.id, slug);
  if (!teamMember) {
    throw new ApiError(401, 'Unauthorized');
  }
  return teamMember;
}

/**
 * 현재 사용자와 해당 팀 정보를 반환. 없으면 401 throw.
 * throwIfNoTeamAccess와 동일한 동작, 네이밍만 다름.
 */
export async function getCurrentUserWithTeam(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return throwIfNoTeamAccess(req, res);
}
