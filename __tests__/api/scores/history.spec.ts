/**
 * Integration Test: /api/scores/history
 *
 * - 405, 401, 기본 조회, type 필터, limit 파라미터
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/score', () => ({ getUserScoreHistory: jest.fn() }));

import handler from '../../../pages/api/scores/history';
import { getSession } from '@/lib/session';
import { getUserScoreHistory } from 'models/score';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetHistory = getUserScoreHistory as jest.MockedFunction<
  typeof getUserScoreHistory
>;

const mockSession = { user: { id: 'user-1' } };

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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(mockSession as any);
});

describe('POST /api/scores/history → 405', () => {
  it('GET 외 메서드는 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('GET /api/scores/history - 인증', () => {
  it('비로그인은 401을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq(), res);
    expect(status).toHaveBeenCalledWith(401);
  });
});

describe('GET /api/scores/history - 조회', () => {
  const history = [
    { id: 'h1', type: 'MACHINE', earnedPoints: 500, createdAt: new Date() },
    { id: 'h2', type: 'TRACK', earnedPoints: 200, createdAt: new Date() },
  ];

  it('전체 점수 이력을 반환한다', async () => {
    mockGetHistory.mockResolvedValue(history as any);
    const { res, json } = makeRes();
    await handler(makeReq(), res);

    expect(mockGetHistory).toHaveBeenCalledWith('user-1', undefined, 50);
    expect(json).toHaveBeenCalledWith({ data: history });
  });

  it('type 쿼리로 필터링할 수 있다', async () => {
    mockGetHistory.mockResolvedValue([history[0]] as any);
    const { res } = makeRes();
    await handler(makeReq({ query: { type: 'MACHINE' } }), res);
    expect(mockGetHistory).toHaveBeenCalledWith('user-1', 'MACHINE', 50);
  });

  it('limit 쿼리로 개수를 제한할 수 있다', async () => {
    mockGetHistory.mockResolvedValue(history as any);
    const { res } = makeRes();
    await handler(makeReq({ query: { limit: '10' } }), res);
    expect(mockGetHistory).toHaveBeenCalledWith('user-1', undefined, 10);
  });
});
