/**
 * Integration Test: /api/machines/[id]/submit
 *
 * - 405 (non-POST)
 * - 401 (비인증)
 * - 403 (blocked 유저)
 * - 400 (machine ID 누락)
 * - submitFlag 결과 정/오답 반환
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('models/flag-submission', () => ({ submitFlag: jest.fn() }));
jest.mock('@/lib/zod', () => ({
  validateWithSchema: jest.fn((schema, data) => {
    const r = schema.safeParse(data);
    if (!r.success) throw new Error(r.error.message);
    return r.data;
  }),
}));

import handler from '../../../pages/api/machines/[id]/submit';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { submitFlag } from 'models/flag-submission';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<
  typeof getUserBySession
>;
const mockSubmitFlag = submitFlag as jest.MockedFunction<typeof submitFlag>;

const mockUser = { id: 'user-1', email: 'test@example.com', isBlocked: false };

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'POST',
    headers: {},
    query: { id: 'machine-1' },
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

describe('GET /api/machines/[id]/submit → 405', () => {
  it('GET 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('POST /api/machines/[id]/submit - 인증', () => {
  it('비로그인은 401을 반환한다', async () => {
    mockGetUserBySession.mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq({ body: { flag: 'flag{test}' } }), res);
    expect(status).toHaveBeenCalledWith(401);
  });

  it('blocked 유저는 403을 반환한다', async () => {
    mockGetUserBySession.mockResolvedValue({
      ...mockUser,
      isBlocked: true,
    } as any);
    const { res, status } = makeRes();
    await handler(makeReq({ body: { flag: 'flag{test}' } }), res);
    expect(status).toHaveBeenCalledWith(403);
  });
});

describe('POST /api/machines/[id]/submit - 플래그 제출', () => {
  it('올바른 플래그 제출 결과를 반환한다', async () => {
    const result = {
      success: true,
      isCorrect: true,
      earnedPoints: 500,
      bloodBonus: 25,
      isFirstBlood: false,
      bloodRank: null,
      message: 'Correct!',
    };
    mockSubmitFlag.mockResolvedValue(result);

    const { res, json } = makeRes();
    await handler(
      makeReq({ body: { flag: 'flag{correct}', teamId: null } }),
      res
    );

    expect(mockSubmitFlag).toHaveBeenCalledWith(
      'machine-1',
      'user-1',
      null,
      'flag{correct}'
    );
    expect(json).toHaveBeenCalledWith({ data: result });
  });

  it('오답 플래그 제출 결과를 반환한다', async () => {
    const result = {
      success: false,
      isCorrect: false,
      earnedPoints: 0,
      bloodBonus: 0,
      isFirstBlood: false,
      bloodRank: null,
      message: 'Wrong flag',
    };
    mockSubmitFlag.mockResolvedValue(result);

    const { res, json } = makeRes();
    await handler(makeReq({ body: { flag: 'flag{wrong}' } }), res);
    expect(json).toHaveBeenCalledWith({ data: result });
  });

  it('이미 풀었을 때 메시지를 반환한다', async () => {
    const result = {
      success: false,
      isCorrect: false,
      earnedPoints: 0,
      bloodBonus: 0,
      isFirstBlood: false,
      bloodRank: null,
      message: 'You have already solved this machine',
    };
    mockSubmitFlag.mockResolvedValue(result);

    const { res, json } = makeRes();
    await handler(makeReq({ body: { flag: 'flag{correct}' } }), res);
    expect(json).toHaveBeenCalledWith({ data: result });
  });

  it('machine이 없으면 submitFlag 에러를 500으로 반환한다', async () => {
    mockSubmitFlag.mockRejectedValue(new Error('Machine not found'));

    const { res, status } = makeRes();
    await handler(makeReq({ body: { flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});
