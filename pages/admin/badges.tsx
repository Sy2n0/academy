import { type ReactElement, useEffect, useMemo, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BadgeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

interface PlaygroundItem {
  codeName: string;
  name: string;
}

interface MappingItem {
  playgroundCodeName: string;
  badgeId: string;
  badgeName: string;
}

interface AssignmentItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  badgeId: string;
  badgeName: string;
  createdAt: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const parseJson = async (res: Response) => {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};
  return res.json();
};

const AdminBadges: NextPageWithLayout = () => {
  const [loading, setLoading] = useState(false);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [playgrounds, setPlaygrounds] = useState<PlaygroundItem[]>([]);
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);

  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    slug: '',
    imageUrl: '',
    description: '',
  });

  const [mappingCodeName, setMappingCodeName] = useState('');
  const [mappingBadgeId, setMappingBadgeId] = useState('');

  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignBadgeId, setAssignBadgeId] = useState('');

  const mappingTable = useMemo(() => {
    const mappingByCode = new Map(
      mappings.map((m) => [m.playgroundCodeName.toLowerCase(), m])
    );
    return playgrounds.map((pg) => ({
      ...pg,
      mapping: mappingByCode.get(pg.codeName.toLowerCase()) || null,
    }));
  }, [playgrounds, mappings]);

  const loadBadges = async () => {
    const res = await fetch('/api/admin/badges');
    const json = await parseJson(res);
    if (!res.ok)
      throw new Error(json?.error?.message || 'Failed to load badges');
    setBadges(
      (json?.data || []).map((item: any) => ({
        ...item,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
      }))
    );
  };

  const loadMappings = async () => {
    const res = await fetch('/api/admin/badges/mappings');
    const json = await parseJson(res);
    if (!res.ok)
      throw new Error(json?.error?.message || 'Failed to load mappings');
    setPlaygrounds(json?.data?.playgrounds || []);
    setMappings(json?.data?.mappings || []);
  };

  const loadAssignments = async () => {
    const res = await fetch('/api/admin/badges/assignments');
    const json = await parseJson(res);
    if (!res.ok)
      throw new Error(json?.error?.message || 'Failed to load assignments');
    setAssignments(json?.data || []);
  };

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users?limit=100');
    const json = await parseJson(res);
    if (!res.ok)
      throw new Error(json?.error?.message || 'Failed to load users');

    setUserOptions(
      (json?.data || []).map((user: any) => ({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || '',
      }))
    );
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBadges(),
        loadMappings(),
        loadAssignments(),
        loadUsers(),
      ]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load badge admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const onSubmitBadge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!badgeForm.name.trim()) {
      toast.error('Badge name is required');
      return;
    }

    setLoading(true);
    try {
      const method = editingBadgeId ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/badges', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingBadgeId ? { id: editingBadgeId } : {}),
          name: badgeForm.name.trim(),
          slug: badgeForm.slug.trim() || undefined,
          imageUrl: badgeForm.imageUrl.trim() || undefined,
          description: badgeForm.description.trim() || undefined,
        }),
      });
      const json = await parseJson(res);
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to save badge');

      toast.success(editingBadgeId ? 'Badge updated' : 'Badge created');
      setEditingBadgeId(null);
      setBadgeForm({ name: '', slug: '', imageUrl: '', description: '' });
      await Promise.all([loadBadges(), loadMappings()]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save badge');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteBadge = async (id: string) => {
    if (!confirm('Delete this badge?')) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/badges?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      const json = await parseJson(res);
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to delete badge');
      toast.success('Badge deleted');
      await Promise.all([loadBadges(), loadMappings(), loadAssignments()]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete badge');
    } finally {
      setLoading(false);
    }
  };

  const onSaveMapping = async () => {
    if (!mappingCodeName || !mappingBadgeId) {
      toast.error('Select codename and badge');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/badges/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playgroundCodeName: mappingCodeName,
          badgeId: mappingBadgeId,
        }),
      });
      const json = await parseJson(res);
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to save mapping');
      toast.success('Mapping saved');
      await loadMappings();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save mapping');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteMapping = async (codeName: string) => {
    if (!confirm(`Delete mapping for ${codeName}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/badges/mappings?playgroundCodeName=${encodeURIComponent(codeName)}`,
        {
          method: 'DELETE',
        }
      );
      const json = await parseJson(res);
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to delete mapping');
      toast.success('Mapping deleted');
      await loadMappings();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete mapping');
    } finally {
      setLoading(false);
    }
  };

  const onAssignBadge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId || !assignBadgeId) {
      toast.error('User and badge are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/badges/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          badgeId: assignBadgeId,
        }),
      });
      const json = await parseJson(res);
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to assign badge');
      toast.success('Badge assigned');
      setSelectedUserId('');
      await loadAssignments();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to assign badge');
    } finally {
      setLoading(false);
    }
  };

  const onRevokeAssignment = async (id: string) => {
    if (!confirm('Revoke this badge assignment?')) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/badges/assignments?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      const json = await parseJson(res);
      if (!res.ok)
        throw new Error(json?.error?.message || 'Failed to revoke assignment');
      toast.success('Assignment removed');
      await loadAssignments();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Badge Management - Admin - HUB ACADEMY</title>
      </Head>

      <div className="relative h-screen bg-background overflow-hidden">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10 h-full">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="h-full flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Badge Management
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-6 md:px-12 py-6 space-y-6">
                <div>
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-5xl tracking-tight text-foreground">
                    BADGE MANAGEMENT
                  </h1>
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Create badges, map playground codename, and assign directly
                    to users
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-border/30 bg-card/50 p-5 space-y-4">
                    <h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
                      Badge Catalog
                    </h2>
                    <form onSubmit={onSubmitBadge} className="space-y-3">
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wider">
                          Name
                        </Label>
                        <Input
                          value={badgeForm.name}
                          onChange={(e) =>
                            setBadgeForm((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wider">
                          Slug
                        </Label>
                        <Input
                          value={badgeForm.slug}
                          onChange={(e) =>
                            setBadgeForm((p) => ({
                              ...p,
                              slug: e.target.value,
                            }))
                          }
                          placeholder="optional-auto-generated"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wider">
                          Image URL
                        </Label>
                        <Input
                          value={badgeForm.imageUrl}
                          onChange={(e) =>
                            setBadgeForm((p) => ({
                              ...p,
                              imageUrl: e.target.value,
                            }))
                          }
                          placeholder="/badge/26_RECRUITING_BADGE.png"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wider">
                          Description
                        </Label>
                        <textarea
                          value={badgeForm.description}
                          onChange={(e) =>
                            setBadgeForm((p) => ({
                              ...p,
                              description: e.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full rounded border border-border/30 bg-background/60 px-3 py-2 font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          {editingBadgeId ? 'Update Badge' : 'Create Badge'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPreviewOpen(true)}
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          Preview
                        </Button>
                        {editingBadgeId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingBadgeId(null);
                              setBadgeForm({
                                name: '',
                                slug: '',
                                imageUrl: '',
                                description: '',
                              });
                            }}
                            className="font-mono text-xs uppercase tracking-wider"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>

                    <div className="max-h-[360px] overflow-y-auto space-y-2">
                      {badges.map((badge) => (
                        <div
                          key={badge.id}
                          className="rounded border border-border/30 bg-background/50 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-mono text-sm text-foreground">
                                {badge.name}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {badge.slug}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingBadgeId(badge.id);
                                  setBadgeForm({
                                    name: badge.name,
                                    slug: badge.slug,
                                    imageUrl: badge.imageUrl || '',
                                    description: badge.description || '',
                                  });
                                }}
                                className="font-mono text-[10px] uppercase"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDeleteBadge(badge.id)}
                                className="font-mono text-[10px] uppercase text-destructive"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {badges.length === 0 && (
                        <p className="font-mono text-xs text-muted-foreground">
                          No badges yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/30 bg-card/50 p-5 space-y-4">
                    <h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
                      Playground Mapping
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        value={mappingCodeName}
                        onValueChange={setMappingCodeName}
                      >
                        <SelectTrigger className="font-mono text-xs">
                          <SelectValue placeholder="Select CODENAME" />
                        </SelectTrigger>
                        <SelectContent>
                          {playgrounds.map((pg) => (
                            <SelectItem key={pg.codeName} value={pg.codeName}>
                              {pg.codeName} ({pg.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={mappingBadgeId}
                        onValueChange={setMappingBadgeId}
                      >
                        <SelectTrigger className="font-mono text-xs">
                          <SelectValue placeholder="Select Badge" />
                        </SelectTrigger>
                        <SelectContent>
                          {badges.map((badge) => (
                            <SelectItem key={badge.id} value={badge.id}>
                              {badge.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={onSaveMapping}
                      disabled={loading}
                      className="font-mono text-xs uppercase tracking-wider"
                    >
                      Save Mapping
                    </Button>

                    <div className="max-h-[360px] overflow-y-auto space-y-2">
                      {mappingTable.map((row) => (
                        <div
                          key={row.codeName}
                          className="rounded border border-border/30 bg-background/50 p-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-mono text-sm text-foreground">
                              {row.codeName}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {row.name}
                            </p>
                            <p className="font-mono text-[10px] text-accent mt-1">
                              {row.mapping
                                ? `Mapped: ${row.mapping.badgeName}`
                                : 'Not mapped'}
                            </p>
                          </div>
                          {row.mapping && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDeleteMapping(row.codeName)}
                              className="font-mono text-[10px] uppercase text-destructive"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/30 bg-card/50 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
                        Direct User Assignment
                      </h2>
                      <p className="font-mono text-[10px] text-muted-foreground mt-1">
                        Assign or revoke badges in a dedicated modal.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setIsAssignmentModalOpen(true)}
                      className="font-mono text-xs uppercase tracking-wider"
                    >
                      Open Assignment Manager
                    </Button>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              Badge Preview
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-lg border border-border/30 bg-background/60 p-4">
            <div className="aspect-square w-full rounded-md overflow-hidden border border-border/30 bg-muted/20 mb-3 flex items-center justify-center">
              {badgeForm.imageUrl?.trim() ? (
                <img
                  src={badgeForm.imageUrl.trim()}
                  alt={badgeForm.name?.trim() || 'Badge Preview'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-mono text-xs text-muted-foreground">
                  NO BADGE IMAGE
                </span>
              )}
            </div>

            <p className="font-mono text-sm text-foreground">
              {badgeForm.name?.trim() || 'Untitled Badge'}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              {badgeForm.slug?.trim() || 'no-slug'}
            </p>
            {badgeForm.description?.trim() && (
              <p className="font-mono text-xs text-foreground/80 mt-2 leading-5">
                {badgeForm.description.trim()}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAssignmentModalOpen}
        onOpenChange={setIsAssignmentModalOpen}
      >
        <DialogContent className="sm:max-w-4xl border-border/30 bg-card/95 backdrop-blur-sm max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              Direct User Assignment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1">
            <form
              onSubmit={onAssignBadge}
              className="grid grid-cols-1 md:grid-cols-[1fr_260px_auto] gap-3 items-end"
            >
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">
                  User
                </Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    {userOptions.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">
                  Badge
                </Label>
                <Select value={assignBadgeId} onValueChange={setAssignBadgeId}>
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue placeholder="Select Badge" />
                  </SelectTrigger>
                  <SelectContent>
                    {badges.map((badge) => (
                      <SelectItem key={badge.id} value={badge.id}>
                        {badge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Assign
              </Button>
            </form>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {assignments.map((item) => (
                <div
                  key={item.id}
                  className="rounded border border-border/30 bg-background/50 p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-mono text-sm text-foreground">
                      {item.userName} ({item.userEmail})
                    </p>
                    <p className="font-mono text-[10px] text-accent">
                      {item.badgeName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRevokeAssignment(item.id)}
                    className="font-mono text-[10px] uppercase text-destructive"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
              {assignments.length === 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  No assignments found.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

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

AdminBadges.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminBadges;
