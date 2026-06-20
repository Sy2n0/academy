/**
 * Unit Test: lib/rbac.ts - validateMembershipOperation
 *
 * 팀 멤버 역할 변경 권한 규칙 검증.
 * getTeamMember를 mock해서 순수 권한 로직만 테스트한다.
 */

jest.mock('models/team', () => ({
  getTeamMember: jest.fn(),
}));

import { validateMembershipOperation } from '@/lib/rbac';
import { getTeamMember } from 'models/team';
import { Role } from '@prisma/client';

const mockGetTeamMember = getTeamMember as jest.MockedFunction<
  typeof getTeamMember
>;

function makeTeamMember(role: Role) {
  return {
    role,
    team: { id: 'team-1', slug: 'test-team' },
    user: { id: 'actor-1' },
    teamId: 'team-1',
    userId: 'actor-1',
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('OWNER 보호', () => {
  it('ADMIN이 OWNER의 역할을 변경하려 하면 403을 던진다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.OWNER));
    const actor = makeTeamMember(Role.ADMIN);
    await expect(
      validateMembershipOperation('target-1', actor)
    ).rejects.toMatchObject({ status: 403 });
  });

  it('MEMBER가 OWNER의 역할을 변경하려 하면 403을 던진다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.OWNER));
    const actor = makeTeamMember(Role.MEMBER);
    await expect(
      validateMembershipOperation('target-1', actor)
    ).rejects.toMatchObject({ status: 403 });
  });

  it('OWNER는 다른 OWNER를 변경할 수 있다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.OWNER));
    const actor = makeTeamMember(Role.OWNER);
    await expect(
      validateMembershipOperation('target-1', actor)
    ).resolves.toBeUndefined();
  });
});

describe('MEMBER 권한 제한', () => {
  it('MEMBER가 ADMIN의 역할을 변경하려 하면 403을 던진다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.ADMIN));
    const actor = makeTeamMember(Role.MEMBER);
    await expect(
      validateMembershipOperation('target-1', actor)
    ).rejects.toMatchObject({ status: 403 });
  });

  it('MEMBER가 다른 MEMBER를 변경하려 해도 역할 자체가 ADMIN이면 403을 던진다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.MEMBER));
    const actor = makeTeamMember(Role.MEMBER);
    await expect(
      validateMembershipOperation('target-1', actor, { role: Role.ADMIN })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('MEMBER가 다른 MEMBER를 OWNER로 올리려 하면 403을 던진다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.MEMBER));
    const actor = makeTeamMember(Role.MEMBER);
    await expect(
      validateMembershipOperation('target-1', actor, { role: Role.OWNER })
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('ADMIN 권한 제한', () => {
  it('ADMIN이 다른 멤버를 OWNER로 올리려 하면 403을 던진다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.MEMBER));
    const actor = makeTeamMember(Role.ADMIN);
    await expect(
      validateMembershipOperation('target-1', actor, { role: Role.OWNER })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('ADMIN은 MEMBER를 ADMIN으로 올릴 수 있다', async () => {
    mockGetTeamMember.mockResolvedValue(makeTeamMember(Role.MEMBER));
    const actor = makeTeamMember(Role.ADMIN);
    await expect(
      validateMembershipOperation('target-1', actor, { role: Role.ADMIN })
    ).resolves.toBeUndefined();
  });
});
