import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
} from '@/components/admin/styles';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface Module {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  tier: string;
  type: string;
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

const AdminModulesPage: NextPageWithLayout = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    difficulty: 'Fundamental',
    duration: '',
    tier: 'Tier 0',
    type: 'REGULAR',
  });

  const { data, error, isLoading, mutate } = useSWR<{ data: Module[] }>(
    '/api/admin/learn/modules',
    fetcher
  );

  const modules = data?.data || [];

  const handleCreateModule = async () => {
    if (!newModule.title.trim()) {
      toast.error('제목은 필수입니다');
      return;
    }

    try {
      const response = await fetch('/api/admin/learn/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newModule),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error?.message || '모듈 생성에 실패했습니다');
        } else {
          throw new Error(
            `모듈 생성에 실패했습니다: ${response.status} ${response.statusText}`
          );
        }
      }

      toast.success('Module created successfully');
      mutate(); // 데이터 새로고침
      setIsCreateModalOpen(false);
      setNewModule({
        title: '',
        description: '',
        category: 'GENERAL',
        difficulty: 'Fundamental',
        duration: '',
        tier: 'Tier 0',
        type: 'REGULAR',
      });
    } catch (error: any) {
      toast.error(error.message || '모듈 생성에 실패했습니다');
    }
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setNewModule({
      title: module.title,
      description: module.description || '',
      category: module.category,
      difficulty: module.difficulty,
      duration: module.duration || '',
      tier: module.tier,
      type: module.type,
    });
    setIsCreateModalOpen(true);
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;
    if (!newModule.title.trim()) {
      toast.error('제목은 필수입니다');
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/learn/modules/${editingModule.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(newModule),
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error?.message || '모듈 수정에 실패했습니다');
        } else {
          throw new Error(
            `모듈 수정에 실패했습니다: ${response.status} ${response.statusText}`
          );
        }
      }

      toast.success('Module updated successfully');
      mutate(); // 데이터 새로고침
      setIsCreateModalOpen(false);
      setEditingModule(null);
      setNewModule({
        title: '',
        description: '',
        category: 'GENERAL',
        difficulty: 'Fundamental',
        duration: '',
        tier: 'Tier 0',
        type: 'REGULAR',
      });
    } catch (error: any) {
      toast.error(error.message || '모듈 수정에 실패했습니다');
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/learn/modules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error?.message || '모듈 삭제에 실패했습니다');
        } else {
          throw new Error(
            `모듈 삭제에 실패했습니다: ${response.status} ${response.statusText}`
          );
        }
      }

      toast.success('Module deleted successfully');
      mutate(); // 데이터 새로고침
    } catch (error: any) {
      toast.error(error.message || '모듈 삭제에 실패했습니다');
    }
  };

  return (
    <>
      <Head>
        <title>Modules Management - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Modules" description="학습 모듈 관리">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className={adminButtonPrimaryClass}
          >
            <Plus className="h-3 w-3" />
            Module
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--warp-rule)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-2 pr-4 text-left font-normal">Title</th>
                <th className="py-2 pr-4 text-left font-normal">Category</th>
                <th className="py-2 pr-4 text-left font-normal">Difficulty</th>
                <th className="py-2 pr-4 text-left font-normal">Tier</th>
                <th className="py-2 pr-4 text-left font-normal">Duration</th>
                <th className="py-2 pr-4 text-left font-normal">Type</th>
                <th className="py-2 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-sm text-muted-foreground"
                  >
                    등록된 모듈이 없습니다.
                  </td>
                </tr>
              ) : (
                modules.map((module) => (
                  <tr
                    key={module.id}
                    className="border-b border-[var(--warp-rule)]"
                  >
                    <td className="py-2.5 pr-4">
                      <p className="text-foreground">{module.title}</p>
                      {module.description && (
                        <p className="mt-0.5 max-w-[22rem] truncate text-xs text-muted-foreground">
                          {module.description}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {module.category}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {module.difficulty}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {module.tier}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {module.duration}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {module.type}
                    </td>
                    <td className="py-2 text-right">
                      {/* These were window.location.href assignments, so every
                          one of them reloaded the whole app to move one route. */}
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/learn/modules/${module.id}/content`}
                          className={adminButtonClass}
                        >
                          Content
                        </Link>
                        <Link
                          href={`/admin/learn/modules/${module.id}/edit`}
                          className={adminButtonClass}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteModule(module.id)}
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
      </AdminLayout>

      {/* Create/Edit Module Modal */}
      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setEditingModule(null);
            setNewModule({
              title: '',
              description: '',
              category: 'GENERAL',
              difficulty: 'Fundamental',
              duration: '',
              tier: 'Tier 0',
              type: 'REGULAR',
            });
          }
        }}
      >
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg uppercase tracking-wider">
              {editingModule ? 'Edit Module' : 'Create New Module'}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              {editingModule
                ? 'Update the module details'
                : 'Fill in the details to create a new learning module'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Title *
              </label>
              <Input
                value={newModule.title}
                onChange={(e) =>
                  setNewModule({ ...newModule, title: e.target.value })
                }
                placeholder="Module title"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Description
              </label>
              <Input
                value={newModule.description}
                onChange={(e) =>
                  setNewModule({ ...newModule, description: e.target.value })
                }
                placeholder="Module description"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                    <span>{newModule.category}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, category: 'GENERAL' })
                      }
                    >
                      GENERAL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, category: 'OFFENSIVE' })
                      }
                    >
                      OFFENSIVE
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, category: 'DEFENSIVE' })
                      }
                    >
                      DEFENSIVE
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Difficulty
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                    <span>{newModule.difficulty}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({
                          ...newModule,
                          difficulty: 'Fundamental',
                        })
                      }
                    >
                      Fundamental
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, difficulty: 'Easy' })
                      }
                    >
                      Easy
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, difficulty: 'Medium' })
                      }
                    >
                      Medium
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, difficulty: 'Hard' })
                      }
                    >
                      Hard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Tier
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                    <span>{newModule.tier}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, tier: 'Tier 0' })
                      }
                    >
                      Tier 0
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, tier: 'Tier I' })
                      }
                    >
                      Tier I
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, tier: 'Tier II' })
                      }
                    >
                      Tier II
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Type
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                    <span>{newModule.type}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, type: 'REGULAR' })
                      }
                    >
                      REGULAR
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setNewModule({ ...newModule, type: 'PREMIUM' })
                      }
                    >
                      PREMIUM
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Duration
              </label>
              <Input
                value={newModule.duration}
                onChange={(e) =>
                  setNewModule({ ...newModule, duration: e.target.value })
                }
                placeholder="e.g., 3h, 6h"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingModule(null);
                  setNewModule({
                    title: '',
                    description: '',
                    category: 'GENERAL',
                    difficulty: 'Fundamental',
                    duration: '',
                    tier: 'Tier 0',
                    type: 'REGULAR',
                  });
                }}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                onClick={
                  editingModule ? handleUpdateModule : handleCreateModule
                }
                className="font-mono text-xs uppercase tracking-wider"
              >
                {editingModule ? 'Update Module' : 'Create Module'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
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
}

AdminModulesPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminModulesPage;
