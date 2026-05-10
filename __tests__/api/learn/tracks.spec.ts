/**
 * Integration Test: /api/learn/tracks (Skill Paths)
 *
 * 응답 형식: { data: [...tracks array] }
 * tracks 배열의 각 항목: { id, title, type, isEnrolled, isCompleted, ... }
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('models/user', () => ({ getUserBySession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    skillPath: { findMany: jest.fn() },
    userSkillPathEnrollment: { findMany: jest.fn() },
    userModuleCompletion: { findMany: jest.fn() },
  },
}));

import handler from '../../../pages/api/learn/tracks';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { prisma } from '@/lib/prisma';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserBySession = getUserBySession as jest.MockedFunction<typeof getUserBySession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'GET', headers: {}, query: {}, body: {}, ...overrides } as NextApiRequest;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  return { res: { json, status, setHeader } as unknown as NextApiResponse, json, status };
}

// modules 포함한 skillPath 구조
const mockSkillPaths = [
  { id: 'sp1', title: 'Web Hacking', description: '', type: 'OFFENSIVE', difficulty: 'Medium', duration: 60, imageUrl: null, modules: [] },
  { id: 'sp2', title: 'Forensics', description: '', type: 'DEFENSIVE', difficulty: 'Easy', duration: 30, imageUrl: null, modules: [] },
];

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.skillPath.findMany as jest.Mock).mockResolvedValue(mockSkillPaths);
  (mockPrisma.userSkillPathEnrollment.findMany as jest.Mock).mockResolvedValue([]);
  (mockPrisma.userModuleCompletion.findMany as jest.Mock).mockResolvedValue([]);
});

describe('POST /api/learn/tracks → 405', () => {
  it('GET 외 메서드는 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('GET /api/learn/tracks - 비로그인', () => {
  it('비로그인 상태에서 모든 skill path 목록을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserBySession.mockResolvedValue(null);

    const { res, json } = makeRes();
    await handler(makeReq(), res);

    // 응답 형식: { data: [...array] }
    const call = json.mock.calls[0][0];
    expect(Array.isArray(call.data)).toBe(true);
    expect(call.data).toHaveLength(2);
  });

  it('비로그인 시 isEnrolled는 모두 false다', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserBySession.mockResolvedValue(null);

    const { res, json } = makeRes();
    await handler(makeReq(), res);

    const call = json.mock.calls[0][0];
    (call.data as any[]).forEach((track) => {
      expect(track.isEnrolled).toBe(false);
    });
  });
});

describe('GET /api/learn/tracks - 로그인', () => {
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: mockUser } as any);
    mockGetUserBySession.mockResolvedValue(mockUser as any);
    (mockPrisma.userSkillPathEnrollment.findMany as jest.Mock).mockResolvedValue([
      { skillPathId: 'sp1' },
    ]);
  });

  it('등록된 skill path는 isEnrolled: true를 반환한다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq(), res);
    const call = json.mock.calls[0][0];
    const enrolled = (call.data as any[]).find((sp) => sp.id === 'sp1');
    const notEnrolled = (call.data as any[]).find((sp) => sp.id === 'sp2');
    expect(enrolled.isEnrolled).toBe(true);
    expect(notEnrolled.isEnrolled).toBe(false);
  });
});

describe('GET /api/learn/tracks - type 필터', () => {
  it('type=OFFENSIVE 쿼리가 prisma where 조건에 전달된다', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserBySession.mockResolvedValue(null);

    const { res } = makeRes();
    await handler(makeReq({ query: { type: 'OFFENSIVE' } }), res);

    expect(mockPrisma.skillPath.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'OFFENSIVE' }),
      })
    );
  });
});
