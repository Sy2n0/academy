import { type ReactElement, useEffect, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StatBar } from '@/components/layouts/StatBar';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
  adminInputClass,
  adminLabelClass,
} from '@/components/admin/styles';
import { matches } from '@/lib/admin-ui';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import { Check, Copy, Plus, Search, X } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Team {
  id: string;
  name: string;
  slug: string;
  inviteCode: string;
  createdAt: string;
  memberCount?: number;
  totalPoints?: number;
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!isAdmin(user.role)) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

const TeamManagement: NextPageWithLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: teamsData, mutate } = useSWR<{ data: { teams: Team[] } }>(
    '/api/admin/teams',
    fetcher
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    inviteCode: '',
  });

  const [memberTeam, setMemberTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<
    { id: string; userId: string; name: string; email: string; role: string }[]
  >([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  const loadMembers = async (teamId: string) => {
    setMemberLoading(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to load members');
      setMembers(json.data.members);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load members');
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    if (!memberTeam) return;
    const q = userSearch.trim();
    let cancelled = false;
    setUserSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/users?limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`
        );
        const json = await res.json();
        if (!cancelled) {
          if (res.ok) {
            setUserResults(
              (json.data || []).map((u: any) => ({
                id: u.id,
                name: u.name || 'Unknown',
                email: u.email || '',
              }))
            );
          } else {
            setUserResults([]);
          }
        }
      } finally {
        if (!cancelled) setUserSearchLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userSearch, memberTeam]);

  const openMemberDialog = (team: Team) => {
    setMemberTeam(team);
    setUserSearch('');
    setUserResults([]);
    setMembers([]);
    loadMembers(team.id);
  };

  const onAddMember = async (userId: string) => {
    if (!memberTeam) return;
    try {
      const res = await fetch(`/api/admin/teams/${memberTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to add member');
      toast.success('Member added');
      await loadMembers(memberTeam.id);
      mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add member');
    }
  };

  const onRemoveMember = async (userId: string) => {
    if (!memberTeam) return;
    if (!window.confirm('이 멤버를 팀에서 제거하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/admin/teams/${memberTeam.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || 'Failed to remove member');
      }
      toast.success('Member removed');
      await loadMembers(memberTeam.id);
      mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove member');
    }
  };

  const onCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreateError(null);

    if (!createForm.name.trim() || !createForm.slug.trim()) {
      setCreateError('Name and slug are required.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          slug: createForm.slug.trim(),
          ...(createForm.inviteCode.trim()
            ? { inviteCode: createForm.inviteCode.trim() }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to create team');
      }
      toast.success('Team created');
      setIsCreateOpen(false);
      setCreateForm({ name: '', slug: '', inviteCode: '' });
      mutate();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const teams = teamsData?.data?.teams || [];
  const needle = searchQuery.toLowerCase();
  const filteredTeams = teams.filter(
    (team) =>
      matches(team.name, needle) ||
      matches(team.slug, needle) ||
      matches(team.inviteCode, needle)
  );

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('초대 코드를 복사했습니다');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <Head>
        <title>Teams - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Teams" description="팀과 초대 코드">
        <StatBar
          stats={[
            { label: 'Teams', value: teams.length },
            { label: 'Showing', value: filteredTeams.length },
          ]}
        />

        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="이름, slug, 초대 코드로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${adminInputClass} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateForm({ name: '', slug: '', inviteCode: '' });
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className={adminButtonPrimaryClass}
          >
            <Plus className="h-3 w-3" />
            Team
          </button>
        </div>

        {filteredTeams.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">
            {searchQuery ? '검색 결과가 없습니다.' : '팀이 없습니다.'}
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--warp-rule)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-normal">Name</th>
                  <th className="py-2 pr-4 text-left font-normal">Slug</th>
                  <th className="py-2 pr-4 text-right font-normal">Members</th>
                  <th className="py-2 pr-4 text-right font-normal">Points</th>
                  <th className="py-2 pr-4 text-left font-normal">Invite</th>
                  <th className="py-2 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-[var(--warp-rule)]"
                  >
                    <td className="py-2.5 pr-4 text-foreground">{team.name}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {team.slug}
                    </td>
                    <td className="warp-num py-2.5 pr-4 text-right text-muted-foreground">
                      {team.memberCount ?? '—'}
                    </td>
                    {/* Points were the one tinted thing on the row. Nothing
                        about a team total is a warning or a state; it is a
                        figure, so it reads as one. */}
                    <td className="warp-num py-2.5 pr-4 text-right text-foreground">
                      {team.totalPoints ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <button
                        type="button"
                        onClick={() => handleCopyInviteCode(team.inviteCode)}
                        className="group inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <code className="warp-num">{team.inviteCode}</code>
                        {copiedCode === team.inviteCode ? (
                          <Check className="h-3 w-3 text-foreground" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openMemberDialog(team)}
                        className={adminButtonClass}
                      >
                        Members
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminLayout>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              Create team
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onCreateTeam} className="space-y-4">
            <div>
              <label className={adminLabelClass}>Name</label>
              <input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. KUCIS_2026"
                maxLength={120}
                className={adminInputClass}
              />
            </div>

            <div>
              <label className={adminLabelClass}>Slug</label>
              <input
                value={createForm.slug}
                onChange={(e) => {
                  const cleaned = e.target.value
                    .replace(/\s+/g, '_')
                    .replace(/[^A-Za-z0-9_-]/g, '');
                  setCreateForm((f) => ({ ...f, slug: cleaned }));
                }}
                placeholder="e.g. KUCIS_2026"
                maxLength={120}
                className={adminInputClass}
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                영문·숫자·언더스코어·하이픈만. 공백은 언더스코어가 됩니다.
              </p>
            </div>

            <div>
              <label className={adminLabelClass}>Invite code (optional)</label>
              <input
                value={createForm.inviteCode}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, inviteCode: e.target.value }))
                }
                placeholder="비우면 자동 생성"
                maxLength={64}
                className={adminInputClass}
              />
            </div>

            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}

            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
                className={adminButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className={adminButtonPrimaryClass}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberTeam !== null}
        onOpenChange={(open) => {
          if (!open) setMemberTeam(null);
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              {memberTeam ? `${memberTeam.name} · Members` : 'Members'}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            <section>
              <h3 className={adminLabelClass}>Current ({members.length})</h3>
              {memberLoading ? (
                <p className="py-3 text-xs text-muted-foreground">Loading...</p>
              ) : members.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">
                  아직 멤버가 없습니다.
                </p>
              ) : (
                <ul className="max-h-48 overflow-y-auto overscroll-contain border-t border-[var(--warp-rule)] pr-1">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 border-b border-[var(--warp-rule)] py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {m.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {m.email} · {m.role}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m.userId)}
                        title="Remove"
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className={adminLabelClass}>Add</h3>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="이름 또는 이메일로 검색"
                  className={`${adminInputClass} pl-9`}
                />
              </div>

              <div className="mt-2 max-h-56 overflow-y-auto overscroll-contain pr-1">
                {userSearchLoading ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    Searching...
                  </p>
                ) : userResults.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    {userSearch.trim()
                      ? '결과가 없습니다.'
                      : '이름을 입력하면 검색합니다.'}
                  </p>
                ) : (
                  <ul className="border-t border-[var(--warp-rule)]">
                    {userResults.map((u) => {
                      const alreadyMember = members.some(
                        (m) => m.userId === u.id
                      );
                      return (
                        <li
                          key={u.id}
                          className="flex items-center gap-3 border-b border-[var(--warp-rule)] py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">
                              {u.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={alreadyMember}
                            onClick={() => onAddMember(u.id)}
                            className={adminButtonClass}
                          >
                            {alreadyMember ? 'Added' : 'Add'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setMemberTeam(null)}
              className={adminButtonClass}
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

TeamManagement.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default TeamManagement;
