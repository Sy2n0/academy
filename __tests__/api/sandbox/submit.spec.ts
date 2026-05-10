/**
 * Integration Test: /api/sandbox/submit
 *
 * 플래그 제출 로직의 핵심 케이스 검증:
 * - 401 (비인증)
 * - 400 (필드 누락)
 * - 404 (problem 없음)
 * - already_solved / correct / wrong
 * - 405
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sandboxProblem: { findUnique: jest.fn() },
    sandboxSolve: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import handler from '../../../pages/api/sandbox/submit';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockSession = { user: { id: 'user-1' } };

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
  mockGetSession.mockResolvedValue(mockSession as any);
});

describe('POST /api/sandbox/submit - 인증', () => {
  it('비로그인 요청은 401을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);
    const { res, json, status } = makeRes();
    await handler(makeReq({ body: { problemId: 'p1', flag: 'flag{test}' } }), res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Unauthorized' } });
  });
});

describe('POST /api/sandbox/submit - 입력 유효성', () => {
  it('problemId 누락 시 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: { flag: 'flag{test}' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('flag 누락 시 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ body: { problemId: 'p1' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });
});

describe('POST /api/sandbox/submit - 문제 조회', () => {
  it('존재하지 않는 problemId는 404를 반환한다', async () => {
    (mockPrisma.sandboxProblem.findUnique as jest.Mock).mockResolvedValue(null);
    const { res, json, status } = makeRes();
    await handler(makeReq({ body: { problemId: 'no-such', flag: 'flag{x}' } }), res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Problem not found' } });
  });
});

describe('POST /api/sandbox/submit - 플래그 판정', () => {
  const problem = { id: 'p1', flag: 'flag{correct}' };

  beforeEach(() => {
    (mockPrisma.sandboxProblem.findUnique as jest.Mock).mockResolvedValue(problem);
  });

  it('이미 풀었으면 already_solved를 반환한다', async () => {
    (mockPrisma.sandboxSolve.findUnique as jest.Mock).mockResolvedValue({ userId: 'user-1', problemId: 'p1' });
    const { res, json } = makeRes();
    await handler(makeReq({ body: { problemId: 'p1', flag: 'flag{correct}' } }), res);
    expect(json).toHaveBeenCalledWith({ data: { result: 'already_solved' } });
  });

  it('정답 플래그는 correct를 반환하고 solve를 기록한다', async () => {
    (mockPrisma.sandboxSolve.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.sandboxSolve.create as jest.Mock).mockResolvedValue({});
    const { res, json } = makeRes();
    await handler(makeReq({ body: { problemId: 'p1', flag: 'flag{correct}' } }), res);
    expect(mockPrisma.sandboxSolve.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', problemId: 'p1' },
    });
    expect(json).toHaveBeenCalledWith({ data: { result: 'correct' } });
  });

  it('앞뒤 공백이 있어도 정답으로 처리한다', async () => {
    (mockPrisma.sandboxSolve.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.sandboxSolve.create as jest.Mock).mockResolvedValue({});
    const { res, json } = makeRes();
    await handler(makeReq({ body: { problemId: 'p1', flag: '  flag{correct}  ' } }), res);
    expect(json).toHaveBeenCalledWith({ data: { result: 'correct' } });
  });

  it('오답 플래그는 wrong을 반환하고 기록하지 않는다', async () => {
    (mockPrisma.sandboxSolve.findUnique as jest.Mock).mockResolvedValue(null);
    const { res, json } = makeRes();
    await handler(makeReq({ body: { problemId: 'p1', flag: 'flag{wrong}' } }), res);
    expect(mockPrisma.sandboxSolve.create).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ data: { result: 'wrong' } });
  });
});

describe('GET /api/sandbox/submit - 솔버 목록', () => {
  it('problemId 없으면 400을 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'GET', query: {} }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('problemId 있으면 솔버 목록을 반환한다', async () => {
    const solves = [{ user: { id: 'u1', name: 'Alice', image: null } }];
    (mockPrisma.sandboxSolve.findMany as jest.Mock).mockResolvedValue(solves);
    const { res, json } = makeRes();
    await handler(makeReq({ method: 'GET', query: { problemId: 'p1' } }), res);
    expect(json).toHaveBeenCalledWith({ data: { solves } });
  });
});

describe('지원하지 않는 메서드', () => {
  it('DELETE는 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'DELETE' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});
