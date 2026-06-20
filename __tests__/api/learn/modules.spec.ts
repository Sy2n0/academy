/**
 * Integration Test: /api/learn/modules
 *
 * 응답 형식: { data: [...modules array] }
 * 각 모듈: { id, title, type, category, difficulty, isCompleted, ... }
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    learningModule: { findMany: jest.fn() },
    userModuleCompletion: { findMany: jest.fn() },
  },
}));

import handler from '../../../pages/api/learn/modules';
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

const mockModules = [
  {
    id: 'mod-1',
    title: 'Linux Basics',
    type: 'REGULAR',
    category: 'GENERAL',
    difficulty: 'Easy',
    duration: 60,
    tier: 'FREE',
    imageUrl: null,
    isActive: true,
  },
  {
    id: 'mod-2',
    title: 'Web Exploitation',
    type: 'PREMIUM',
    category: 'OFFENSIVE',
    difficulty: 'Medium',
    duration: 120,
    tier: 'PRO',
    imageUrl: null,
    isActive: true,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.learningModule.findMany as jest.Mock).mockResolvedValue(
    mockModules
  );
  (mockPrisma.userModuleCompletion.findMany as jest.Mock).mockResolvedValue([]);
});

describe('POST /api/learn/modules → 405', () => {
  it('GET 외 메서드는 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('GET /api/learn/modules - 비로그인', () => {
  it('비로그인 상태에서 module 목록을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserBySession.mockResolvedValue(null);

    const { res, json } = makeRes();
    await handler(makeReq(), res);

    // 응답 형식: { data: [...array] }
    const call = json.mock.calls[0][0];
    expect(Array.isArray(call.data)).toBe(true);
    expect(call.data).toHaveLength(2);
  });

  it('비로그인 시 모두 isCompleted: false다', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserBySession.mockResolvedValue(null);

    const { res, json } = makeRes();
    await handler(makeReq(), res);

    const call = json.mock.calls[0][0];
    (call.data as any[]).forEach((m) => {
      expect(m.isCompleted).toBe(false);
    });
  });
});

describe('GET /api/learn/modules - 로그인', () => {
  const mockUser = { id: 'user-1' };
  const completedAt = new Date('2025-01-01');

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: mockUser } as any);
    mockGetUserBySession.mockResolvedValue(mockUser as any);
    (mockPrisma.userModuleCompletion.findMany as jest.Mock).mockResolvedValue([
      { moduleId: 'mod-1', completedAt },
    ]);
  });

  it('완료한 module은 isCompleted: true다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq(), res);
    const call = json.mock.calls[0][0];
    const completed = (call.data as any[]).find((m) => m.id === 'mod-1');
    const notCompleted = (call.data as any[]).find((m) => m.id === 'mod-2');
    expect(completed.isCompleted).toBe(true);
    expect(notCompleted.isCompleted).toBe(false);
  });

  it('각 모듈에 title, type, category, difficulty 필드가 있다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq(), res);
    const call = json.mock.calls[0][0];
    (call.data as any[]).forEach((m) => {
      expect(m).toHaveProperty('title');
      expect(m).toHaveProperty('type');
      expect(m).toHaveProperty('category');
      expect(m).toHaveProperty('difficulty');
    });
  });
});
