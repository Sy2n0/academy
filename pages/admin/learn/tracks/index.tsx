import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
} from '@/components/admin/styles';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  GripVertical,
} from 'lucide-react';
import useSWR from 'swr';

interface Track {
  id: string;
  title: string;
  description: string | null;
  type: string;
  difficulty: string;
  duration: string | null;
  imageUrl: string | null;
  isActive: boolean;
  moduleCount: number;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('불러오기에 실패했습니다');
  }
  return res.json();
};

const AdminTracksPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTrack, setNewTrack] = useState({
    title: '',
    description: '',
    type: 'Binary Exploitation',
    difficulty: 'Easy',
    duration: '',
    imageUrl: '',
    moduleIds: [] as string[],
  });

  // 모든 Module 가져오기
  const { data: modulesData } = useSWR<{
    data: Array<{ id: string; title: string }>;
  }>('/api/admin/learn/modules', fetcher);

  const allModules = modulesData?.data || [];
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);

  // 검색 필터링된 Module 목록
  const filteredModules = allModules.filter((module) =>
    module.title.toLowerCase().includes(moduleSearchQuery.toLowerCase())
  );

  // 선택된 Module 목록 (순서 유지)
  const selectedModules = newTrack.moduleIds
    .map((id) => allModules.find((m) => m.id === id))
    .filter((m): m is { id: string; title: string } => m !== undefined);

  // 선택되지 않은 Module 목록
  const unselectedModules = filteredModules.filter(
    (module) => !newTrack.moduleIds.includes(module.id)
  );

  const { data, error, isLoading, mutate } = useSWR<{ data: Track[] }>(
    '/api/admin/learn/tracks',
    fetcher
  );

  const tracks = data?.data || [];

  const handleCreateTrack = async () => {
    if (!newTrack.title.trim()) {
      toast.error('제목은 필수입니다');
      return;
    }

    try {
      // Track 생성
      const response = await fetch('/api/admin/learn/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTrack.title,
          description: newTrack.description,
          type: newTrack.type,
          difficulty: newTrack.difficulty,
          duration: newTrack.duration,
          imageUrl: newTrack.imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '트랙 생성에 실패했습니다');
      }

      const trackData = await response.json();
      const trackId = trackData.data.id;

      // 선택된 Module들을 Track에 연결
      if (newTrack.moduleIds.length > 0) {
        for (let i = 0; i < newTrack.moduleIds.length; i++) {
          const moduleId = newTrack.moduleIds[i];
          await fetch(`/api/admin/learn/tracks/${trackId}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              moduleId,
              order: i,
            }),
          });
        }
      }

      toast.success('Track created successfully');
      setIsCreateModalOpen(false);
      setModuleSearchQuery('');
      setNewTrack({
        title: '',
        description: '',
        type: 'Binary Exploitation',
        difficulty: 'Easy',
        duration: '',
        imageUrl: '',
        moduleIds: [],
      });
      mutate();
    } catch (error: any) {
      toast.error(error.message || '트랙 생성에 실패했습니다');
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/learn/tracks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '트랙 삭제에 실패했습니다');
      }

      toast.success('Track deleted successfully');
      mutate();
    } catch (error: any) {
      toast.error(error.message || '트랙 삭제에 실패했습니다');
    }
  };

  const handleEditTrack = (track: Track) => {
    router.push(`/admin/learn/tracks/${track.id}/edit`);
  };

  return (
    <AdminLayout title="Tracks" description="스킬 패스와 트랙 관리">
      <Head>
        <title>Tracks - Admin - HUB ACADEMY</title>
      </Head>
      <div className="flex justify-end">
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className={adminButtonPrimaryClass}>
              <Plus className="h-4 w-4 mr-2" />
              New Track
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-mono text-lg uppercase tracking-wider">
                Create New Track
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2 min-h-0">
              <div>
                <Label
                  htmlFor="title"
                  className="font-mono text-sm font-semibold"
                >
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={newTrack.title}
                  onChange={(e) =>
                    setNewTrack({ ...newTrack, title: e.target.value })
                  }
                  className="font-mono text-sm mt-1"
                  placeholder="Enter track title"
                />
              </div>
              <div>
                <Label
                  htmlFor="description"
                  className="font-mono text-sm font-semibold"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newTrack.description}
                  onChange={(e) =>
                    setNewTrack({
                      ...newTrack,
                      description: e.target.value,
                    })
                  }
                  className="font-mono text-sm mt-1"
                  placeholder="Enter track description"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="type"
                    className="font-mono text-sm font-semibold"
                  >
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newTrack.type}
                    onValueChange={(value) =>
                      setNewTrack({ ...newTrack, type: value })
                    }
                  >
                    <SelectTrigger className="font-mono text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Binary Exploitation">
                        Binary Exploitation
                      </SelectItem>
                      <SelectItem value="Web Exploitation">
                        Web Exploitation
                      </SelectItem>
                      <SelectItem value="Reverse Engineering">
                        Reverse Engineering
                      </SelectItem>
                      <SelectItem value="Digital Forensic">
                        Digital Forensic
                      </SelectItem>
                      <SelectItem value="Cryptography">Cryptography</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="difficulty"
                    className="font-mono text-sm font-semibold"
                  >
                    Difficulty <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newTrack.difficulty}
                    onValueChange={(value) =>
                      setNewTrack({ ...newTrack, difficulty: value })
                    }
                  >
                    <SelectTrigger className="font-mono text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="duration"
                    className="font-mono text-sm font-semibold"
                  >
                    Duration
                  </Label>
                  <Input
                    id="duration"
                    value={newTrack.duration}
                    onChange={(e) =>
                      setNewTrack({
                        ...newTrack,
                        duration: e.target.value,
                      })
                    }
                    className="font-mono text-sm mt-1"
                    placeholder="e.g., 6d 2h, 2d"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="imageUrl"
                    className="font-mono text-sm font-semibold"
                  >
                    Image URL
                  </Label>
                  <Input
                    id="imageUrl"
                    value={newTrack.imageUrl}
                    onChange={(e) =>
                      setNewTrack({
                        ...newTrack,
                        imageUrl: e.target.value,
                      })
                    }
                    className="font-mono text-sm mt-1"
                    placeholder="Enter image URL"
                  />
                  {newTrack.imageUrl && (
                    <div className="mt-3">
                      <Label className="font-mono text-xs text-muted-foreground mb-2 block">
                        Preview
                      </Label>
                      <div className="border border-border/30 rounded-md overflow-hidden bg-background/40">
                        <img
                          src={newTrack.imageUrl}
                          alt="Preview"
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (
                              parent &&
                              !parent.querySelector('.error-message')
                            ) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className =
                                'w-full h-40 flex items-center justify-center error-message';
                              errorDiv.innerHTML =
                                '<p class="font-mono text-xs text-destructive">이미지를 불러오지 못했습니다</p>';
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="font-mono text-sm font-semibold mb-2 block">
                  Modules
                </Label>

                {/* 검색 입력 */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={moduleSearchQuery}
                    onChange={(e) => setModuleSearchQuery(e.target.value)}
                    className="font-mono text-sm pl-9"
                    placeholder="Search modules..."
                  />
                </div>

                {/* 선택된 Module 목록 (드래그 앤 드롭 가능) */}
                {selectedModules.length > 0 && (
                  <div className="mb-4">
                    <Label className="font-mono text-xs text-muted-foreground mb-2 block">
                      Selected Modules ({selectedModules.length})
                    </Label>
                    <div className="border border-border/30 rounded-md p-2 space-y-2 max-h-40 overflow-y-auto">
                      {selectedModules.map((module, index) => (
                        <div
                          key={module.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedModuleId(module.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (
                              !draggedModuleId ||
                              draggedModuleId === module.id
                            )
                              return;

                            const draggedIndex =
                              newTrack.moduleIds.indexOf(draggedModuleId);
                            const targetIndex = index;

                            if (draggedIndex === -1) return;

                            const newModuleIds = [...newTrack.moduleIds];
                            newModuleIds.splice(draggedIndex, 1);
                            newModuleIds.splice(
                              targetIndex,
                              0,
                              draggedModuleId
                            );

                            setNewTrack({
                              ...newTrack,
                              moduleIds: newModuleIds,
                            });
                            setDraggedModuleId(null);
                          }}
                          onDragEnd={() => {
                            setDraggedModuleId(null);
                          }}
                          className={`flex items-center gap-2 p-2 rounded bg-[var(--warp-veil)] border border-[var(--warp-rule)] cursor-move hover:bg-white/[0.07] transition-colors ${
                            draggedModuleId === module.id ? 'opacity-50' : ''
                          }`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-mono text-sm text-foreground flex-1">
                            {index + 1}. {module.title}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              setNewTrack({
                                ...newTrack,
                                moduleIds: newTrack.moduleIds.filter(
                                  (id) => id !== module.id
                                ),
                              });
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 선택 가능한 Module 목록 */}
                <div>
                  <Label className="font-mono text-xs text-muted-foreground mb-2 block">
                    Available Modules
                  </Label>
                  <div className="border border-border/30 rounded-md p-2 max-h-40 overflow-y-auto">
                    {unselectedModules.length === 0 ? (
                      <p className="font-mono text-xs text-muted-foreground text-center py-4">
                        {moduleSearchQuery
                          ? 'No modules found'
                          : 'No modules available'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {unselectedModules.map((module) => (
                          <button
                            key={module.id}
                            type="button"
                            onClick={() => {
                              setNewTrack({
                                ...newTrack,
                                moduleIds: [...newTrack.moduleIds, module.id],
                              });
                              setModuleSearchQuery('');
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/[0.03] cursor-pointer text-left transition-colors"
                          >
                            <span className="font-mono text-sm text-foreground">
                              {module.title}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              + Add
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border/30 mt-4 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setModuleSearchQuery('');
                  }}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTrack}
                  className={adminButtonPrimaryClass}
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-muted-foreground">
            Loading tracks...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-destructive">
            트랙 목록을 불러오지 못했습니다
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--warp-rule)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-2 pr-4 text-left font-normal">Title</th>
                <th className="py-2 pr-4 text-left font-normal">Type</th>
                <th className="py-2 pr-4 text-left font-normal">Difficulty</th>
                <th className="py-2 pr-4 text-left font-normal">Duration</th>
                <th className="py-2 pr-4 text-right font-normal">Modules</th>
                <th className="py-2 pr-4 text-right font-normal">Enrolled</th>
                <th className="py-2 pr-4 text-left font-normal">State</th>
                <th className="py-2 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-sm text-muted-foreground"
                  >
                    트랙이 없습니다.
                  </td>
                </tr>
              ) : (
                tracks.map((track) => (
                  <tr
                    key={track.id}
                    className="border-b border-[var(--warp-rule)]"
                  >
                    <td className="py-2.5 pr-4 text-foreground">
                      {track.title}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {track.type}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {track.difficulty}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {track.duration || '—'}
                    </td>
                    <td className="warp-num py-2.5 pr-4 text-right text-muted-foreground">
                      {track.moduleCount}
                    </td>
                    <td className="warp-num py-2.5 pr-4 text-right text-muted-foreground">
                      {track.enrollmentCount}
                    </td>
                    {/* Active/Inactive was a green pill against a red one.
                              Neither is a warning; the state is one word. */}
                    <td className="py-2.5 pr-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {track.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTrack(track)}
                          className={adminButtonClass}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTrack(track.id)}
                          className={`${adminButtonClass} hover:text-destructive`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
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

  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

AdminTracksPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminTracksPage;
