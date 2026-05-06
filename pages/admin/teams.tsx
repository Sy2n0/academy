import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { Users, Search, Copy, Check, TrendingUp, Plus, UserPlus, X } from 'lucide-react';
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
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: teamsData, mutate } = useSWR<{ data: { teams: Team[] } }>(
    '/api/admin/teams',
    fetcher
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', inviteCode: '' });

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
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load members');
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
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to add member');
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
          ...(createForm.inviteCode.trim() ? { inviteCode: createForm.inviteCode.trim() } : {}),
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
  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.inviteCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Invite code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <Head>
        <title>Team Management - Admin - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-h-screen flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href="/admin/dashboard"
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          Admin
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Team Management
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-6">
                  <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight text-foreground mb-2" style={{ fontStyle: 'italic' }}>
                          TEAM MANAGEMENT
                        </h1>
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                          Manage Teams and Invite Codes
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setCreateForm({ name: '', slug: '', inviteCode: '' });
                          setCreateError(null);
                          setIsCreateOpen(true);
                        }}
                        size="sm"
                        className="font-mono text-xs uppercase tracking-wider gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create Team
                      </Button>
                    </div>

                    {/* Search */}
                    <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search teams by name, slug, or invite code..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="font-mono pl-10"
                        />
                      </div>
                    </div>

                    {/* Teams List */}
                    <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                      <h2 className="font-mono text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Teams ({filteredTeams.length})
                      </h2>

                      {filteredTeams.length === 0 ? (
                        <p className="font-mono text-sm text-muted-foreground text-center py-8">
                          {searchQuery ? 'No teams found matching your search.' : 'No teams found.'}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {filteredTeams.map((team) => (
                            <div
                              key={team.id}
                              className="flex items-center justify-between p-4 border border-border/30 rounded-lg bg-background/40 hover:border-accent/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-mono text-base font-semibold text-foreground truncate">
                                    {team.name}
                                  </h3>
                                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                                    {team.slug}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  {team.memberCount !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-mono text-xs text-muted-foreground">
                                        {team.memberCount} members
                                      </span>
                                    </div>
                                  )}
                                  {team.totalPoints !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3 text-accent" />
                                      <span className="font-mono text-xs text-accent font-semibold">
                                        {team.totalPoints} pts
                                      </span>
                                    </div>
                                  )}
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    Created: {new Date(team.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openMemberDialog(team)}
                                  className="font-mono text-xs uppercase tracking-wider gap-2"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Members
                                </Button>
                                <div className="flex items-center gap-2 px-3 py-1.5 border border-border/30 rounded bg-background/60">
                                  <code className="font-mono text-xs text-foreground">
                                    {team.inviteCode}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyInviteCode(team.inviteCode)}
                                    className="h-6 w-6 p-0"
                                  >
                                    {copiedCode === team.inviteCode ? (
                                      <Check className="h-3 w-3 text-accent" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              Create Team
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onCreateTeam} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. KUCIS_2026"
                maxLength={120}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Slug</Label>
              <Input
                value={createForm.slug}
                onChange={(e) => {
                  const cleaned = e.target.value
                    .replace(/\s+/g, '_')
                    .replace(/[^A-Za-z0-9_-]/g, '');
                  setCreateForm((f) => ({ ...f, slug: cleaned }));
                }}
                placeholder="e.g. KUCIS_2026"
                maxLength={120}
                className="font-mono text-xs"
              />
              <p className="font-mono text-[10px] text-muted-foreground">
                Letters, numbers, underscores, and dashes only. Spaces become underscores.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">
                Invite Code <span className="normal-case text-muted-foreground">(optional)</span>
              </Label>
              <Input
                value={createForm.inviteCode}
                onChange={(e) => setCreateForm((f) => ({ ...f, inviteCode: e.target.value }))}
                placeholder="Auto-generated if blank"
                maxLength={64}
                className="font-mono text-xs"
              />
            </div>

            {createError && (
              <p className="font-mono text-[11px] text-red-400">{createError}</p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating}
                className="font-mono text-xs uppercase tracking-wider"
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
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
        <DialogContent className="sm:max-w-2xl border-border/30 bg-card/95 backdrop-blur-sm max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              {memberTeam ? `Members · ${memberTeam.name}` : 'Members'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">
                Current Members ({members.length})
              </Label>
              {memberLoading ? (
                <p className="font-mono text-xs text-muted-foreground py-3">Loading...</p>
              ) : members.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground py-3">
                  No members yet.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border border-border/30 rounded bg-background/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-foreground truncate">{m.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">
                          {m.email} · {m.role}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMember(m.userId)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Add Member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="font-mono text-xs pl-9"
                />
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {userSearchLoading ? (
                  <p className="font-mono text-xs text-muted-foreground py-2">Searching...</p>
                ) : userResults.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground py-2">
                    {userSearch.trim() ? 'No users found.' : 'Start typing to search users.'}
                  </p>
                ) : (
                  userResults.map((u) => {
                    const alreadyMember = members.some((m) => m.userId === u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 border border-border/30 rounded bg-background/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-foreground truncate">{u.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate">
                            {u.email}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={alreadyMember}
                          onClick={() => onAddMember(u.id)}
                          className="font-mono text-[10px] uppercase tracking-wider"
                        >
                          {alreadyMember ? 'Added' : 'Add'}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMemberTeam(null)}
              className="font-mono text-xs uppercase tracking-wider"
            >
              Close
            </Button>
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
