/**
 * Integration Test: /api/teams/join
 *
 * - 405, 401, inviteCode 누락, 잘못된 코드, 이미 멤버, 성공
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('models/team', () => ({ joinTeamByInviteCode: jest.fn() }));
jest.mock('@/lib/zod', () => ({
  validateWithSchema: jest.fn((schema, data) => {
    const r = schema.safeParse(data);
    if (!r.success) throw new Error(r.error.message);
    return r.data;
  }),
}));

import handler from '../../../pages/api/teams/join';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { joinTeamByInviteCode } from 'models/team';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<
  typeof getUserBySession
>;
const mockJoinTeam = joinTeamByInviteCode as jest.MockedFunction<
  typeof joinTeamByInviteCode
>;

const mockUser = { id: 'user-1', email: 'user@test.com' };

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'POST',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  } as NextApiRequest;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  return {
    res: { json, status, setHeader } as unknown as NextApiResponse,
    json,
    status,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ user: mockUser } as any);
  mockGetUserBySession.mockResolvedValue(mockUser as any);
});

describe('GET /api/teams/join → 405', () => {
  it('GET 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('POST /api/teams/join - 인증', () => {
  it('비로그인은 401을 반환한다', async () => {
    mockGetUserBySession.mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq({ body: { inviteCode: 'abc123' } }), res);
    expect(status).toHaveBeenCalledWith(401);
  });
});

describe('POST /api/teams/join - inviteCode 유효성', () => {
  it('inviteCode 누락 시 오류를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: {} }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('빈 inviteCode는 오류를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: { inviteCode: '' } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('POST /api/teams/join - 팀 합류', () => {
  it('유효한 코드로 팀에 합류한다', async () => {
    const teamResult = { teamId: 'team-1', teamName: 'Example' };
    mockJoinTeam.mockResolvedValue(teamResult);

    const { res, json } = makeRes();
    await handler(makeReq({ body: { inviteCode: 'valid-code' } }), res);

    expect(mockJoinTeam).toHaveBeenCalledWith('valid-code', 'user-1');
    expect(json).toHaveBeenCalledWith({
      data: { message: 'Successfully joined team', team: teamResult },
    });
  });

  it('잘못된 초대 코드는 500 오류를 반환한다', async () => {
    mockJoinTeam.mockRejectedValue(new Error('Invalid invite code'));
    const { res, status } = makeRes();
    await handler(makeReq({ body: { inviteCode: 'bad-code' } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('이미 팀 멤버인 경우 500 오류를 반환한다', async () => {
    mockJoinTeam.mockRejectedValue(
      new Error('You are already a member of this team')
    );
    const { res, status } = makeRes();
    await handler(makeReq({ body: { inviteCode: 'valid-code' } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});
