/**
 * Integration Test: /api/teams/[slug]/members
 *
 * - GET: 멤버 목록 조회
 * - DELETE: 멤버 삭제 (권한 필요)
 * - PATCH: 역할 변경 (권한 필요)
 * - 405
 */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('models/team', () => ({
  throwIfNoTeamAccess: jest.fn(),
  getTeamMembers: jest.fn(),
  removeTeamMember: jest.fn(),
  countTeamMembers: jest.fn(),
}));
jest.mock('models/user', () => ({ throwIfNotAllowed: jest.fn() }));
jest.mock('models/teamMember', () => ({ updateTeamMember: jest.fn(), countTeamMembers: jest.fn() }));
jest.mock('@/lib/rbac', () => ({ validateMembershipOperation: jest.fn() }));
jest.mock('@/lib/retraced', () => ({ sendAudit: jest.fn() }));
jest.mock('@/lib/svix', () => ({ sendEvent: jest.fn() }));
jest.mock('@/lib/metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/zod', () => ({
  validateWithSchema: jest.fn((schema, data) => {
    const r = schema.safeParse(data);
    if (!r.success) throw new Error(r.error.message);
    return r.data;
  }),
  deleteMemberSchema: { safeParse: jest.fn() },
  updateMemberSchema: { safeParse: jest.fn() },
}));

import handler from '../../../../pages/api/teams/[slug]/members';
import { throwIfNoTeamAccess, getTeamMembers, removeTeamMember } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { updateTeamMember } from 'models/teamMember';
import { validateMembershipOperation } from '@/lib/rbac';

const mockThrowIfNoTeamAccess = throwIfNoTeamAccess as jest.MockedFunction<typeof throwIfNoTeamAccess>;
const mockThrowIfNotAllowed = throwIfNotAllowed as jest.MockedFunction<typeof throwIfNotAllowed>;
const mockGetTeamMembers = getTeamMembers as jest.MockedFunction<typeof getTeamMembers>;
const mockRemoveTeamMember = removeTeamMember as jest.MockedFunction<typeof removeTeamMember>;
const mockUpdateTeamMember = updateTeamMember as jest.MockedFunction<typeof updateTeamMember>;
const mockValidateMembership = validateMembershipOperation as jest.MockedFunction<typeof validateMembershipOperation>;

const ownerTeamMember = {
  role: 'OWNER',
  teamId: 'team-1',
  userId: 'user-1',
  team: { id: 'team-1', slug: 'example' },
  user: { id: 'user-1', name: 'Owner' },
};

function makeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'GET', headers: {}, query: { slug: 'example' }, body: {}, ...overrides } as NextApiRequest;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  return { res: { json, status, setHeader } as unknown as NextApiResponse, json, status };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockThrowIfNoTeamAccess.mockResolvedValue(ownerTeamMember as any);
  mockThrowIfNotAllowed.mockReturnValue(undefined);
  mockValidateMembership.mockResolvedValue(undefined);
});

describe('지원하지 않는 메서드 → 405', () => {
  it('POST 요청은 405를 반환한다', async () => {
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(status).toHaveBeenCalledWith(405);
  });
});

describe('GET /api/teams/[slug]/members', () => {
  it('멤버 목록을 반환한다', async () => {
    const members = [
      { id: 'user-1', name: 'Owner', role: 'OWNER' },
      { id: 'user-2', name: 'Member', role: 'MEMBER' },
    ];
    mockGetTeamMembers.mockResolvedValue(members as any);

    const { res, json } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);

    expect(mockGetTeamMembers).toHaveBeenCalledWith('example');
    expect(json).toHaveBeenCalledWith({ data: members });
  });
});

describe('DELETE /api/teams/[slug]/members', () => {
  beforeEach(() => {
    const { validateWithSchema } = require('@/lib/zod');
    (validateWithSchema as jest.Mock).mockReturnValue({ memberId: 'user-2' });
  });

  it('멤버를 삭제한다', async () => {
    mockRemoveTeamMember.mockResolvedValue({ id: 'user-2' } as any);

    const { res, json } = makeRes();
    await handler(makeReq({ method: 'DELETE', query: { slug: 'example', memberId: 'user-2' } }), res);

    expect(mockRemoveTeamMember).toHaveBeenCalledWith('team-1', 'user-2');
    expect(json).toHaveBeenCalledWith({ data: {} });
  });

  it('존재하지 않는 멤버 삭제 시 404를 반환한다', async () => {
    mockRemoveTeamMember.mockResolvedValue(null);
    const { res, status } = makeRes();
    await handler(makeReq({ method: 'DELETE', query: { slug: 'example', memberId: 'ghost' } }), res);
    expect(status).toHaveBeenCalledWith(404);
  });
});

describe('PATCH /api/teams/[slug]/members - 역할 변경', () => {
  beforeEach(() => {
    const { validateWithSchema } = require('@/lib/zod');
    (validateWithSchema as jest.Mock).mockReturnValue({ memberId: 'user-2', role: 'ADMIN' });
    mockUpdateTeamMember.mockResolvedValue({ id: 'user-2', role: 'ADMIN' } as any);
  });

  it('멤버 역할을 변경한다', async () => {
    const { res, json } = makeRes();
    await handler(makeReq({ method: 'PATCH', body: { memberId: 'user-2', role: 'ADMIN' } }), res);

    expect(mockValidateMembership).toHaveBeenCalled();
    expect(mockUpdateTeamMember).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ data: { id: 'user-2', role: 'ADMIN' } });
  });
});
