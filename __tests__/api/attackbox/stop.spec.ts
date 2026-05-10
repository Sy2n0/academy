/**
 * Integration Test: /api/attackbox/stop
 *
 * Docker exec 없이 테스트 가능한 범위:
 * - 405 (non-POST)
 * - 401 (비인증)
 * - 400 (containerName 유효성 검사)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { attackBoxSession: { deleteMany: jest.fn() } },
}));
jest.mock('child_process', () => ({
  exec: jest.fn((_cmd, cb) => cb(null, { stdout: '', stderr: '' })),
}));

import handler from '../../../pages/api/attackbox/stop';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<typeof getUserBySession>;

const mockUser = { id: 'user-1', email: 'test@example.com' };

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
});

describe('GET /api/attackbox/stop → 405', () => {
  it('POST 외 메서드는 405를 반환한다', async () => {
    const { res, json, status } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Method not allowed' } });
  });
});

describe('POST /api/attackbox/stop - 인증', () => {
  it('비로그인 요청은 401을 반환한다', async () => {
    mockGetUserBySession.mockResolvedValue(null);
    const { res, json, status } = makeRes();
    await handler(makeReq({ body: { containerName: 'attackbox-kali-22000' } }), res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Unauthorized' } });
  });
});

describe('POST /api/attackbox/stop - containerName 유효성 검사', () => {
  const invalidNames = [
    '',
    'random-name',
    'attackbox-22000',          // 타입 없음
    'attackbox-KALI-22000',     // 대문자
    'attackbox-kali-abc',       // 숫자 아닌 포트
    'attackbox-kali-22000; rm -rf /', // 인젝션 시도
  ];

  invalidNames.forEach((name) => {
    it(`"${name || '(빈 값)'}": 400 반환`, async () => {
      const { res, status } = makeRes();
      await handler(makeReq({ body: { containerName: name } }), res);
      expect(status).toHaveBeenCalledWith(400);
    });
  });

  it('올바른 containerName은 통과한다 (kali 타입)', async () => {
    const { exec } = require('child_process');
    exec.mockImplementation((_cmd: string, cb: Function) => cb(null, { stdout: '', stderr: '' }));

    const { prisma } = require('@/lib/prisma');
    prisma.attackBoxSession.deleteMany.mockResolvedValue({});

    const { res, json } = makeRes();
    await handler(makeReq({ body: { containerName: 'attackbox-kali-22000' } }), res);
    expect(json).toHaveBeenCalledWith({ success: true, containerName: 'attackbox-kali-22000' });
  });
});
