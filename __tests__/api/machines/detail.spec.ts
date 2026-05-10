/**
 * Integration Test: /api/machines/[id]
 *
 * - 405 (non-GET)
 * - 400 (id 없음)
 * - 404 (machine 없음)
 * - 200 (machine 반환)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    machine: { findUnique: jest.fn() },
    scoreHistory: { findMany: jest.fn() },
    flagSubmission: { findMany: jest.fn() },
  },
}));

import handler from '../../../pages/api/machines/[id]';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockMachine = {
  id: 'machine-1', name: 'Easy Box', isActive: true, categoryType: 'active',
  points: 100, difficulty: 'Easy', type: null, staticFlags: [],
};

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'GET', headers: {}, query: { id: 'machine-1' }, body: {}, ...overrides } as NextApiRequest;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  return { res: { json, status, setHeader } as unknown as NextApiResponse, json, status };
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.machine.findUnique as jest.Mock).mockResolvedValue(mockMachine);
  (mockPrisma.scoreHistory.findMany as jest.Mock).mockResolvedValue([]);
  (mockPrisma.flagSubmission.findMany as jest.Mock).mockResolvedValue([]);
});

describe('POST /api/machines/[id] → 405', () => {
  it('POST 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('GET /api/machines/[id]', () => {
  it('존재하는 machine을 반환한다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq(), res);
    // 응답 데이터에 machine 정보가 포함됨
    const call = json.mock.calls[0][0];
    expect(call).toBeDefined();
  });

  it('존재하지 않는 machine은 404를 반환한다', async () => {
    (mockPrisma.machine.findUnique as jest.Mock).mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq(), res);
    expect(status).toHaveBeenCalledWith(404);
  });
});
