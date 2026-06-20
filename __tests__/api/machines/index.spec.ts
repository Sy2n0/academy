/**
 * Integration Test: /api/machines
 *
 * 응답 형식: { data: { machines, userStats: { totalScore, solvedCount } } }
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    machine: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    flagSubmission: { findMany: jest.fn() },
  },
}));

import handler from '../../../pages/api/machines/index';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<
  typeof getUserBySession
>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'GET',
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

// machine 모델 필드 최소 구성
const mockMachines = [
  {
    id: 'm1',
    name: 'Easy Box',
    points: 100,
    difficulty: 'Easy',
    type: null,
    isActive: true,
    categoryType: 'active',
  },
  {
    id: 'm2',
    name: 'Hard Box',
    points: 500,
    difficulty: 'Hard',
    type: null,
    isActive: true,
    categoryType: 'active',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.machine.findMany as jest.Mock).mockResolvedValue(mockMachines);
  (mockPrisma.flagSubmission.findMany as jest.Mock).mockResolvedValue([]);
});

describe('POST /api/machines → 405', () => {
  it('POST 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('GET /api/machines - 비로그인', () => {
  it('비로그인 상태에서도 machines 목록을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserBySession.mockResolvedValue(null);

    const { res, json } = makeRes();
    await handler(makeReq(), res);

    const call = json.mock.calls[0][0];
    expect(call).toHaveProperty('data');
    expect(call.data).toHaveProperty('machines');
    expect(Array.isArray(call.data.machines)).toBe(true);
  });

  it('비로그인 시 userStats.totalScore는 0이다', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserBySession.mockResolvedValue(null);

    const { res, json } = makeRes();
    await handler(makeReq(), res);

    const call = json.mock.calls[0][0];
    expect(call.data.userStats.totalScore).toBe(0);
    expect(call.data.userStats.solvedCount).toBe(0);
  });
});

describe('GET /api/machines - 로그인', () => {
  const mockUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: mockUser } as any);
    mockGetUserBySession.mockResolvedValue(mockUser as any);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      totalPoints: 1500,
    });
    (mockPrisma.flagSubmission.findMany as jest.Mock).mockResolvedValue([
      { machineId: 'm1', userId: 'user-1', teamId: null },
    ]);
  });

  it('로그인 시 userStats.totalScore와 userStats.solvedCount가 포함된다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq(), res);
    const call = json.mock.calls[0][0];
    expect(call.data.userStats.totalScore).toBe(1500);
    expect(call.data.userStats.solvedCount).toBe(1);
  });

  it('각 machine에 solvedCount 필드가 있다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq(), res);
    const call = json.mock.calls[0][0];
    for (const machine of call.data.machines) {
      expect(machine).toHaveProperty('solvedCount');
    }
  });
});
