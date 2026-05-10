/**
 * Integration Test: /api/playground/submit-flag
 *
 * 조기 반환(early return) 케이스 중심 검증:
 * - 405, 401, 필드 누락, challenge 없음
 * - Playground 종료 (403), 미등록 (403)
 * - 오답 (correct: false), 이미 풀었을 때
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('@/lib/user-roles', () => ({ isAdmin: jest.fn().mockReturnValue(false) }));
jest.mock('@/lib/discord', () => ({ sendDiscordWebhook: jest.fn() }));
jest.mock('models/score', () => ({ awardPoints: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    playgroundChallenge: { findUnique: jest.fn() },
    playgroundSettings: { findFirst: jest.fn() },
    playgroundEnrollment: { findMany: jest.fn() },
    scoreHistory: { findMany: jest.fn(), create: jest.fn() },
    user: { update: jest.fn() },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

import handler from '../../../pages/api/playground/submit-flag';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<typeof getUserBySession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockUser = { id: 'user-1', email: 'test@example.com', role: 'USER' };

const activeChallenge = {
  id: 'ch-1', title: 'Web Challenge', flag: 'flag{secret}',
  value: 100, difficulty: 'Easy', category: 'WEB',
  playgroundCodeName: 'summer2025', isActive: true,
};

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'POST', headers: {}, query: {}, body: {}, ...overrides } as NextApiRequest;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  return { res: { json, status, setHeader } as unknown as NextApiResponse, json, status };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ user: mockUser } as any);
  mockGetUserBySession.mockResolvedValue(mockUser as any);
  (mockPrisma.playgroundChallenge.findUnique as jest.Mock).mockResolvedValue(activeChallenge);
  (mockPrisma.playgroundSettings.findFirst as jest.Mock).mockResolvedValue(null); // 종료일 없음
  (mockPrisma.playgroundEnrollment.findMany as jest.Mock).mockResolvedValue([
    { playground: { codeName: 'summer2025' } },
  ]);
  (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: 0 }]);
  (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);
  (mockPrisma.scoreHistory.findMany as jest.Mock).mockResolvedValue([]);
});

describe('GET /api/playground/submit-flag → 405', () => {
  it('POST 외 메서드는 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('POST /api/playground/submit-flag - 인증', () => {
  it('비로그인은 401을 반환한다', async () => {
    mockGetUserBySession.mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq({ body: { challengeId: 'ch-1', flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(401);
  });
});

describe('POST /api/playground/submit-flag - 입력 검증', () => {
  it('challengeId 누락 시 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: { flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('flag 누락 시 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: { challengeId: 'ch-1' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });
});

describe('POST /api/playground/submit-flag - challenge 조회', () => {
  it('존재하지 않는 challenge는 404를 반환한다', async () => {
    (mockPrisma.playgroundChallenge.findUnique as jest.Mock).mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq({ body: { challengeId: 'no-ch', flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('isActive=false인 challenge는 404를 반환한다', async () => {
    (mockPrisma.playgroundChallenge.findUnique as jest.Mock).mockResolvedValue({
      ...activeChallenge, isActive: false,
    });
    const { res, status } = makeRes();
    await handler(makeReq({ body: { challengeId: 'ch-1', flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(404);
  });
});

describe('POST /api/playground/submit-flag - 종료일/등록', () => {
  it('종료된 playground는 403을 반환한다', async () => {
    (mockPrisma.playgroundSettings.findFirst as jest.Mock).mockResolvedValue({
      endDate: '2020-01-01', name: 'Old CTF',
    });
    const { res, status } = makeRes();
    await handler(makeReq({ body: { challengeId: 'ch-1', flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(403);
  });

  it('미등록 사용자는 403을 반환한다', async () => {
    (mockPrisma.playgroundEnrollment.findMany as jest.Mock).mockResolvedValue([]);
    const { res, status } = makeRes();
    await handler(makeReq({ body: { challengeId: 'ch-1', flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(403);
  });
});

describe('POST /api/playground/submit-flag - 플래그 판정', () => {
  it('오답은 correct: false를 반환한다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq({ body: { challengeId: 'ch-1', flag: 'flag{wrong}' } }), res);
    const call = json.mock.calls[0][0];
    expect(call.data.correct).toBe(false);
  });

  it('이미 푼 문제는 alreadySolved: true를 반환한다', async () => {
    // 이전 점수 이력에 동일 challengeId가 존재
    (mockPrisma.scoreHistory.findMany as jest.Mock).mockResolvedValue([
      { metadata: { challengeId: 'ch-1' } },
    ]);
    const { res, json } = makeRes();
    await handler(makeReq({ body: { challengeId: 'ch-1', flag: 'flag{secret}' } }), res);
    const call = json.mock.calls[0][0];
    expect(call.data.correct).toBe(true);
    expect(call.data.alreadySolved).toBe(true);
  });
});
