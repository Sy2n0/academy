/**
 * Integration Test: /api/scores/award
 *
 * 점수 지급 API 핸들러를 session mock과 함께 검증한다.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}));

jest.mock('models/score', () => ({
  awardPoints: jest.fn(),
}));

jest.mock('@/lib/zod', () => ({
  validateWithSchema: jest.fn((schema, data) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  }),
}));

import handler from '../../../pages/api/scores/award';
import { getSession } from '@/lib/session';
import { awardPoints } from 'models/score';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockAwardPoints = awardPoints as jest.MockedFunction<typeof awardPoints>;

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
  const res = {
    json,
    status,
    setHeader,
    headersSent: false,
  } as unknown as NextApiResponse;
  return { res, json, status };
}

const mockSession = { user: { id: 'user-1', email: 'test@example.com' } };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/scores/award', () => {
  it('인증된 사용자에게 점수를 지급한다', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockAwardPoints.mockResolvedValue({
      pointsEarned: 500,
      user: { totalPoints: 1500, currentRank: 3 },
      rankUp: false,
    } as any);

    const req = makeReq({
      method: 'POST',
      body: {
        type: 'MACHINE',
        basePoints: 500,
        description: 'Solved machine challenge',
      },
    });
    const { res, json } = makeRes();

    await handler(req, res);

    expect(mockAwardPoints).toHaveBeenCalledWith(
      'user-1',
      'MACHINE',
      500,
      'Solved machine challenge',
      undefined
    );
    expect(json).toHaveBeenCalledWith({
      data: {
        pointsEarned: 500,
        totalPoints: 1500,
        currentRank: 3,
        rankUp: false,
      },
    });
  });

  it('비인증 요청은 401을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = makeReq({
      method: 'POST',
      body: { type: 'MACHINE', basePoints: 100 },
    });
    const { res, json, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: { message: 'Unauthorized' },
    });
    expect(mockAwardPoints).not.toHaveBeenCalled();
  });

  it('잘못된 type 값은 오류를 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);

    const req = makeReq({
      method: 'POST',
      body: { type: 'INVALID_TYPE', basePoints: 100 },
    });
    const { res, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalled();
    expect(mockAwardPoints).not.toHaveBeenCalled();
  });

  it('basePoints가 0 이하면 오류를 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);

    const req = makeReq({
      method: 'POST',
      body: { type: 'MACHINE', basePoints: 0 },
    });
    const { res, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalled();
    expect(mockAwardPoints).not.toHaveBeenCalled();
  });

  it('GET 메서드는 405를 반환한다', async () => {
    const req = makeReq({ method: 'GET' });
    const { res, json, status } = makeRes();

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({
      error: { message: 'Method GET Not Allowed' },
    });
  });
});
