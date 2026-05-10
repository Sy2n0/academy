/**
 * Integration Test: /api/invitations/[token]
 *
 * - 405 (non-GET)
 * - 400 (만료된 초대)
 * - 200 (유효한 초대)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('models/invitation', () => ({
  getInvitation: jest.fn(),
  isInvitationExpired: jest.fn(),
}));
jest.mock('@/lib/metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/zod', () => ({
  getInvitationSchema: {
    safeParse: jest.fn((data) => ({ success: true, data: { token: data.token } })),
  },
  validateWithSchema: jest.fn((schema, data) => {
    const r = schema.safeParse(data);
    if (!r.success) throw new Error('Validation failed');
    return r.data;
  }),
}));

import handler from '../../../pages/api/invitations/[token]';
import { getInvitation, isInvitationExpired } from 'models/invitation';

const mockGetInvitation = getInvitation as jest.MockedFunction<typeof getInvitation>;
const mockIsExpired = isInvitationExpired as jest.MockedFunction<typeof isInvitationExpired>;

const validInvitation = {
  id: 'inv-1', email: 'invited@example.com', role: 'MEMBER',
  token: 'valid-token', expires: new Date(Date.now() + 3600000),
  allowedDomains: null, url: 'http://localhost/invite/valid-token',
};

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'GET', headers: {}, query: { token: 'valid-token' }, body: {}, ...overrides } as NextApiRequest;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  return { res: { json, status, setHeader } as unknown as NextApiResponse, json, status };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInvitation.mockResolvedValue(validInvitation as any);
  mockIsExpired.mockResolvedValue(false);
});

describe('POST /api/invitations/[token] → 405', () => {
  it('POST 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('GET /api/invitations/[token]', () => {
  it('유효한 초대 토큰으로 초대 정보를 반환한다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq(), res);
    expect(json).toHaveBeenCalledWith({ data: validInvitation });
  });

  it('만료된 초대는 400을 반환한다', async () => {
    mockIsExpired.mockResolvedValue(true);
    const { res, status } = makeRes();
    await handler(makeReq(), res);
    expect(status).toHaveBeenCalledWith(400);
  });
});
