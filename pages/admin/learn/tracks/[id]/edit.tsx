import { type ReactElement, useState, useEffect } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { Save, ArrowLeft, Search, GripVertical, X } from 'lucide-react';
import useSWR from 'swr';

interface TrackModule {
  id: string;
  moduleId: string;
  order: number;
  module: {
    id: string;
    title: string;
  };
}

interface Track {
  id: string;
  title: string;
  description: string | null;
  type: string;
  difficulty: string;
  duration: string | null;
  imageUrl: string | null;
  isActive: boolean;
  modules: TrackModule[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('불러오기에 실패했습니다');
  return res.json();
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }
  if (!isAdmin(user.role)) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

const AdminTrackEditPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [saving, setSaving] = useState(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'OFFENSIVE',
    difficulty: 'Easy',
    duration: '',
    imageUrl: '',
    isActive: true,
  });

  const [moduleIds, setModuleIds] = useState<string[]>([]);

  const { data, error, isLoading } = useSWR<{ data: Track }>(
    id ? `/api/admin/learn/tracks/${id}` : null,
    fetcher
  );

  const { data: modulesData } = useSWR<{ data: Array<{ id: string; title: string }> }>(
    '/api/admin/learn/modules',
    fetcher
  );

  const allModules = modulesData?.data || [];

  useEffect(() => {
    if (data?.data) {
      const track = data.data;
      setFormData({
        title: track.title || '',
        description: track.description || '',
        type: track.type || 'OFFENSIVE',
        difficulty: track.difficulty || 'Easy',
        duration: track.duration || '',
        imageUrl: track.imageUrl || '',
        isActive: track.isActive ?? true,
      });
      // 기존 연결된 모듈 순서대로
      const sorted = [...(track.modules || [])].sort((a, b) => a.order - b.order);
      setModuleIds(sorted.map((tm) => tm.moduleId));
    }
  }, [data]);

  const selectedModules = moduleIds
    .map((mid) => allModules.find((m) => m.id === mid))
    .filter((m): m is { id: string; title: string } => m !== undefined);

  const filteredAvailable = allModules.filter(
    (m) =>
      !moduleIds.includes(m.id) &&
      m.title.toLowerCase().includes(moduleSearchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('제목은 필수입니다');
      return;
    }
    setSaving(true);
    try {
      // 1. Track 기본 정보 업데이트
      const res = await fetch(`/api/admin/learn/tracks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || '트랙 수정에 실패했습니다');
      }

      // 2. 모듈 연결 업데이트: 기존 전부 삭제 후 재등록
      const existingModuleIds = (data?.data?.modules || []).map((tm) => tm.moduleId);

      // 기존 모듈 전부 삭제
      for (const existingId of existingModuleIds) {
        await fetch(`/api/admin/learn/tracks/${id}/modules?moduleId=${encodeURIComponent(existingId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      // 새 순서대로 전부 등록
      for (let i = 0; i < moduleIds.length; i++) {
        await fetch(`/api/admin/learn/tracks/${id}/modules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ moduleId: moduleIds[i], order: i }),
        });
      }

      toast.success('Track updated successfully');
      router.push('/admin/learn/tracks');
    } catch (e: any) {
      toast.error(e.message || '트랙 수정에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-destructive">트랙을 불러오지 못했습니다</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Track - Admin - HUB ACADEMY</title>
      </Head>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="min-h-screen flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30">
            <div className="flex items-center gap-2 px-6 md:px-12">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/admin/learn" className="font-mono text-xs uppercase tracking-wider">
                      Learn
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/admin/learn/tracks" className="font-mono text-xs uppercase tracking-wider">
                      Tracks
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                      Edit Track
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h1 className="font-mono text-3xl font-bold text-foreground">
                  {formData.title || 'Untitled Track'}
                </h1>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/admin/learn/tracks')}
                    className="font-mono text-xs"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="font-mono text-xs bg-accent hover:bg-accent/90 text-foreground"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Basic Info */}
                <div className="space-y-6">
                  <div className="border border-border/50 rounded-xl bg-card/60 p-6 space-y-4">
                    <h2 className="font-mono text-sm font-bold uppercase tracking-wider">Basic Information</h2>
                    <div>
                      <Label className="font-mono text-sm font-semibold">Title <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="font-mono text-sm mt-1"
                        placeholder="Track title"
                      />
                    </div>
                    <div>
                      <Label className="font-mono text-sm font-semibold">Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="font-mono text-sm mt-1 min-h-[100px]"
                        placeholder="Track description"
                      />
                    </div>
                    <div>
                      <Label className="font-mono text-sm font-semibold">Image URL</Label>
                      <Input
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="font-mono text-sm mt-1"
                        placeholder="https://..."
                      />
                      {formData.imageUrl && (
                        <div className="mt-2 border border-border/30 rounded-md overflow-hidden">
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-36 object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-border/50 rounded-xl bg-card/60 p-6 space-y-4">
                    <h2 className="font-mono text-sm font-bold uppercase tracking-wider">Settings</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-mono text-sm font-semibold">Type</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                          <SelectTrigger className="font-mono text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OFFENSIVE">OFFENSIVE</SelectItem>
                            <SelectItem value="DEFENSIVE">DEFENSIVE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="font-mono text-sm font-semibold">Difficulty</Label>
                        <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                          <SelectTrigger className="font-mono text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fundamental">Fundamental</SelectItem>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="font-mono text-sm font-semibold">Duration</Label>
                      <Input
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="font-mono text-sm mt-1"
                        placeholder="e.g., 6d 2h"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-mono text-sm font-semibold">Active</Label>
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Modules */}
                <div className="border border-border/50 rounded-xl bg-card/60 p-6 space-y-4">
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
                    Modules ({moduleIds.length})
                  </h2>

                  {/* Selected modules (draggable) */}
                  {selectedModules.length > 0 && (
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground mb-2 block">Selected (drag to reorder)</Label>
                      <div className="border border-border/30 rounded-md p-2 space-y-1.5 max-h-52 overflow-y-auto">
                        {selectedModules.map((mod, index) => (
                          <div
                            key={mod.id}
                            draggable
                            onDragStart={() => setDraggedModuleId(mod.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (!draggedModuleId || draggedModuleId === mod.id) return;
                              const fromIdx = moduleIds.indexOf(draggedModuleId);
                              const toIdx = index;
                              if (fromIdx === -1) return;
                              const next = [...moduleIds];
                              next.splice(fromIdx, 1);
                              next.splice(toIdx, 0, draggedModuleId);
                              setModuleIds(next);
                              setDraggedModuleId(null);
                            }}
                            onDragEnd={() => setDraggedModuleId(null)}
                            className={`flex items-center gap-2 p-2 rounded bg-accent/10 border border-accent/20 cursor-move hover:bg-accent/20 transition-colors ${
                              draggedModuleId === mod.id ? 'opacity-40' : ''
                            }`}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono text-sm text-foreground flex-1 truncate">
                              {index + 1}. {mod.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => setModuleIds(moduleIds.filter((mid) => mid !== mod.id))}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search + available */}
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground mb-2 block">Add Modules</Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={moduleSearchQuery}
                        onChange={(e) => setModuleSearchQuery(e.target.value)}
                        className="font-mono text-sm pl-9"
                        placeholder="Search modules..."
                      />
                    </div>
                    <div className="border border-border/30 rounded-md p-2 max-h-52 overflow-y-auto">
                      {filteredAvailable.length === 0 ? (
                        <p className="font-mono text-xs text-muted-foreground text-center py-4">
                          {moduleSearchQuery ? 'No modules found' : 'All modules already added'}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {filteredAvailable.map((mod) => (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => {
                                setModuleIds([...moduleIds, mod.id]);
                                setModuleSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent/10 text-left transition-colors"
                            >
                              <span className="font-mono text-sm text-foreground flex-1 truncate">{mod.title}</span>
                              <span className="text-xs text-muted-foreground shrink-0">+ Add</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

AdminTrackEditPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminTrackEditPage;
