import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import useSWR from 'swr';
import toast from 'react-hot-toast';
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

      <div className="relative min-h-screen bg-background">
        <div className="relative z-10">
          <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href="/admin/learn"
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          Learn Management
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Modules
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                      MODULES
                    </h1>
                    <p className="font-mono text-sm text-muted-foreground">
                      Manage learning modules
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="font-mono text-xs uppercase tracking-wider"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Module
                  </Button>
                </div>

                {/* Modules Table */}
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm">
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/30">
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Title
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Category
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Difficulty
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Tier
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Duration
                            </th>
                            <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Type
                            </th>
                            <th className="text-right py-3 px-4 font-mono text-xs uppercase tracking-wider text-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {modules.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center">
                                <p className="font-mono text-sm text-muted-foreground">
                                  No modules found. Create your first module.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            modules.map((module) => (
                              <tr
                                key={module.id}
                                className="border-b border-border/20 hover:bg-background/60 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="font-mono text-sm text-foreground">
                                      {module.title}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                      {module.description}
                                    </p>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-foreground">
                                    {module.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-foreground">
                                    {module.difficulty}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-foreground">
                                    {module.tier}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-foreground">
                                    {module.duration}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs text-foreground">
                                    {module.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="font-mono text-xs"
                                      onClick={() => {
                                        window.location.href = `/admin/learn/modules/${module.id}/content`;
                                      }}
                                    >
                                      Edit Content
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="font-mono text-xs"
                                      onClick={() => {
                                        window.location.href = `/admin/learn/modules/${module.id}/edit`;
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="font-mono text-xs text-destructive hover:text-destructive"
                                      onClick={() =>
                                        handleDeleteModule(module.id)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

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
              <label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
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
              <label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
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
                <label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                  Category
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent transition-colors">
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
                <label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                  Difficulty
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent transition-colors">
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
                <label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                  Tier
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent transition-colors">
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
                <label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
                  Type
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent transition-colors">
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
              <label className="font-mono text-xs uppercase tracking-wider text-foreground mb-2 block">
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
