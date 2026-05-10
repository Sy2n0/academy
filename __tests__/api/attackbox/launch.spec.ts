/**
 * Integration Test: /api/attackbox/launch
 *
 * Docker exec 전 조기 반환(early return) 케이스만 검증:
 * - 405, 401, image 누락(400), 지원하지 않는 image(400), username 유효성(400)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    attackBoxSession: {
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));
// Docker exec은 이 테스트에서 호출되지 않는 경로만 테스트하므로 단순 mock
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) =>
      new Promise((resolve, reject) => fn(...args, (err: unknown, val: unknown) => (err ? reject(err) : resolve(val)))),
}));

import handler from '../../../pages/api/attackbox/launch';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<typeof getUserBySession>;

const mockUser = { id: 'user-1', email: 'test@example.com' };

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'POST', headers: { host: 'localhost' }, query: {}, body: {}, ...overrides } as NextApiRequest;
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

  // 기존 세션 없는 상태로 초기화
  (prisma as any).attackBoxSession = { findUnique: jest.fn().mockResolvedValue(null), deleteMany: jest.fn(), upsert: jest.fn() };
});

describe('POST /api/attackbox/launch - 405', () => {
  it('GET 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('POST /api/attackbox/launch - 401', () => {
  it('비로그인 요청은 401을 반환한다', async () => {
    mockGetUserBySession.mockResolvedValue(null);
    const { res, json, status } = makeRes();
    await handler(makeReq({ body: { image: '@PLATFORM/HUB-ATTACKBOX/kali-rolling' } }), res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Unauthorized' } });
  });
});

describe('POST /api/attackbox/launch - image 유효성', () => {
  it('image 누락 시 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: {} }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('지원하지 않는 image는 400을 반환한다', async () => {
    const { res, json, status } = makeRes();
    await handler(makeReq({ body: { image: 'unknown/image:latest' } }), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Unsupported image' } });
  });
});

describe('POST /api/attackbox/launch - username 유효성', () => {
  it('포트를 직접 지정할 때 username 없으면 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(
      makeReq({
        body: {
          image: '@PLATFORM/HUB-ATTACKBOX/kali-rolling',
          port: 22000, // 명시적 포트 → username 필수
        },
      }),
      res
    );
    expect(status).toHaveBeenCalledWith(400);
  });

  it('username에 특수문자가 있으면 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(
      makeReq({
        body: {
          image: '@PLATFORM/HUB-ATTACKBOX/kali-rolling',
          port: 22000,
          username: 'bad user!',
        },
      }),
      res
    );
    expect(status).toHaveBeenCalledWith(400);
  });

  it('SSH 포트와 Web 포트가 같으면 400을 반환한다', async () => {
    const { res, json, status } = makeRes();
    await handler(
      makeReq({
        body: {
          image: '@PLATFORM/HUB-ATTACKBOX/kali-rolling',
          port: 22000,
          webPort: 22000,
          username: 'hub',
        },
      }),
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: { message: 'SSH port and Web port must be different' },
    });
  });
});
