/**
 * Integration Test: /api/teams
 *
 * Prisma와 session을 mock해서 실제 API 핸들러 로직만 검증한다.
 * DB 없이 실행 가능하다.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// --- 모듈 mock ---

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    team: { findMany: jest.fn(), create: jest.fn() },
    teamMember: { create: jest.fn() },
  },
}));

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

jest.mock('models/user', () => ({
  getUserBySession: jest.fn(),
}));

jest.mock('models/team', () => ({
  getUserTeams: jest.fn(),
  createTeam: jest.fn(),
}));

import handler from '../../../pages/api/teams/index';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { getUserTeams, createTeam } from 'models/team';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<
  typeof getUserBySession
>;
const mockGetUserTeams = getUserTeams as jest.MockedFunction<
  typeof getUserTeams
>;
const mockCreateTeam = createTeam as jest.MockedFunction<typeof createTeam>;

// --- 헬퍼 ---

function makeReq(
  overrides: Partial<NextApiRequest> = {}
): NextApiRequest {
  return {
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  } as NextApiRequest;
}

function makeRes(): { res: NextApiResponse; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  const res = { json, status, setHeader } as unknown as NextApiResponse;
  return { res, json, status };
}

const mockUser = { id: 'user-1', name: 'Tester', email: 'test@example.com' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ user: mockUser } as any);
  mockGetUserBySession.mockResolvedValue(mockUser as any);
});

// --- Tests ---

describe('GET /api/teams', () => {
  it('인증된 사용자에게 팀 목록을 반환한다', async () => {
    const teams = [
      { id: 't1', name: 'Team A', slug: 'team-a' },
      { id: 't2', name: 'Team B', slug: 'team-b' },
    ];
    mockGetUserTeams.mockResolvedValue(teams as any);

    const req = makeReq({ method: 'GET' });
    const { res, json } = makeRes();

    await handler(req, res);

    expect(mockGetUserTeams).toHaveBeenCalledWith(mockUser.id);
    expect(json).toHaveBeenCalledWith({ data: { teams } });
  });

  it('인증되지 않은 요청은 401을 반환한다', async () => {
    mockGetUserBySession.mockResolvedValue(null);

    const req = makeReq({ method: 'GET' });
    const { res, json, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: { message: 'Unauthorized' },
    });
  });
});

describe('POST /api/teams', () => {
  it('유효한 데이터로 팀을 생성한다', async () => {
    const newTeam = {
      id: 't-new',
      name: 'New Team',
      slug: 'new-team',
      inviteCode: 'abc123',
    };
    mockCreateTeam.mockResolvedValue(newTeam as any);

    const req = makeReq({
      method: 'POST',
      body: { name: 'New Team', slug: 'new-team' },
    });
    const { res, json } = makeRes();

    await handler(req, res);

    expect(mockCreateTeam).toHaveBeenCalledWith('New Team', 'new-team', mockUser.id, undefined);
    expect(json).toHaveBeenCalledWith({
      data: {
        message: 'Team created successfully',
        team: newTeam,
      },
    });
  });

  it('슬러그에 대문자가 포함되면 Zod 유효성 오류를 반환한다', async () => {
    const req = makeReq({
      method: 'POST',
      body: { name: 'Team', slug: 'Invalid-Slug' },
    });
    const { res, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(mockCreateTeam).not.toHaveBeenCalled();
  });

  it('필수 필드 누락 시 오류를 반환한다', async () => {
    const req = makeReq({
      method: 'POST',
      body: { name: 'Team Only' }, // slug 누락
    });
    const { res, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(mockCreateTeam).not.toHaveBeenCalled();
  });
});

describe('지원하지 않는 HTTP 메서드', () => {
  it('405를 반환한다', async () => {
    const req = makeReq({ method: 'DELETE' });
    const { res, json, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({
      error: { message: 'Method DELETE Not Allowed' },
    });
  });
});
