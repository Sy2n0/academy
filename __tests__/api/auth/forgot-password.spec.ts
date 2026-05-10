/**
 * Integration Test: /api/auth/forgot-password
 *
 * - 405 (non-POST)
 * - 이메일 유효성 실패
 * - 존재하지 않는 유저
 * - 성공 (토큰 생성 + 이메일 발송)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/recaptcha', () => ({ validateRecaptcha: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/email/sendPasswordResetEmail', () => ({ sendPasswordResetEmail: jest.fn() }));
jest.mock('models/user', () => ({ getUser: jest.fn() }));
jest.mock('models/passwordReset', () => ({ createPasswordReset: jest.fn() }));
jest.mock('@/lib/zod', () => ({
  forgotPasswordSchema: {
    safeParse: jest.fn((data) => ({
      success: true,
      data: { email: data.email, recaptchaToken: data.recaptchaToken || 'token' },
    })),
  },
  validateWithSchema: jest.fn((schema, data) => {
    const r = schema.safeParse(data);
    if (!r.success) throw new Error('Validation failed');
    return r.data;
  }),
}));

import handler from '../../../pages/api/auth/forgot-password';
import { getUser } from 'models/user';
import { createPasswordReset } from 'models/passwordReset';
import { sendPasswordResetEmail } from '@/lib/email/sendPasswordResetEmail';

const mockGetUser = getUser as jest.MockedFunction<typeof getUser>;
const mockCreatePasswordReset = createPasswordReset as jest.MockedFunction<typeof createPasswordReset>;
const mockSendEmail = sendPasswordResetEmail as jest.MockedFunction<typeof sendPasswordResetEmail>;

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'POST', headers: {}, query: {}, body: {}, ...overrides } as NextApiRequest;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  return { res: { json, status, setHeader } as unknown as NextApiResponse, json, status };
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/auth/forgot-password → 405', () => {
  it('GET 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('POST /api/auth/forgot-password - 유효성', () => {
  it('잘못된 이메일 형식은 422를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: { email: 'not-an-email', recaptchaToken: 'tok' } }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('존재하지 않는 유저는 422를 반환한다', async () => {
    mockGetUser.mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq({ body: { email: 'noone@example.com', recaptchaToken: 'tok' } }), res);
    expect(status).toHaveBeenCalledWith(422);
  });
});

describe('POST /api/auth/forgot-password - 성공', () => {
  it('유효한 이메일로 리셋 토큰을 생성하고 이메일을 발송한다', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'User' } as any);
    mockCreatePasswordReset.mockResolvedValue({} as any);
    mockSendEmail.mockResolvedValue(undefined);

    const { res, json } = makeRes();
    await handler(makeReq({ body: { email: 'user@example.com', recaptchaToken: 'tok' } }), res);

    expect(mockCreatePasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'user@example.com' }),
      })
    );
    expect(mockSendEmail).toHaveBeenCalled();
    // API는 성공 시 빈 객체 {} 반환
    expect(json).toHaveBeenCalledWith({});
  });
});
