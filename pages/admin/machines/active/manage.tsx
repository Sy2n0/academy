import { type ReactElement, useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Server, Plus, Edit, Trash2, Search, Power, PowerOff } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface Machine {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  maxAttempts: number | null;
  score: number;
  difficultyFactor: number;
  minimumScoreRatio: number;
  bloodBonus: boolean;
  containerImage: string | null;
  servicePort: number | null;
  cpuLimit: number | null;
  memoryLimit: number | null;
  storageLimit: number | null;
  enableTrafficCapture: boolean;
  categoryType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MachinesResponse {
  data: {
    machines: Machine[];
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ManageActiveMachines: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<MachinesResponse>(
    '/api/admin/machines/active',
    fetcher
  );

  const machines = data?.data?.machines || [];
  const filteredMachines = machines.filter((machine) =>
    machine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!selectedMachine) return;

    try {
      const response = await fetch(`/api/admin/machines/active/${selectedMachine.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('머신 삭제에 실패했습니다');
      }

      toast.success('Machine deleted successfully');
      setIsDeleteOpen(false);
      setSelectedMachine(null);
      mutate();
    } catch (error: any) {
      toast.error(error?.message || '머신 삭제에 실패했습니다');
    }
  };

  const handleToggleActive = async (machineId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/machines/active/${machineId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('머신 상태 변경에 실패했습니다');
      }

      toast.success(`Machine ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      mutate();
    } catch (error: any) {
      toast.error(error?.message || '머신 상태 변경에 실패했습니다');
    }
  };

  return (
    <>
      <Head>
        <title>Manage Active Machines - Admin - HUB ACADEMY</title>
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
                        <BreadcrumbLink href="/admin/dashboard" className="font-mono text-xs uppercase tracking-wider">
                          Admin
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Active Machines
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 md:px-12 py-6">
                  <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Server className="h-6 w-6 text-accent" />
                          <h1 className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground" style={{ fontStyle: 'italic' }}>
                            MANAGE ACTIVE MACHINES
                          </h1>
                        </div>
                        <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                          Manage and configure Active Machines
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push('/admin/machines/active/create')}
                        className="font-mono text-xs uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New
                      </Button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search by title or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="font-mono pl-10"
                      />
                    </div>

                    {/* Machines List */}
                    {isLoading ? (
                      <div className="text-center py-12">
                        <p className="font-mono text-sm text-muted-foreground">Loading machines...</p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <p className="font-mono text-sm text-destructive">머신 목록을 불러오지 못했습니다</p>
                      </div>
                    ) : filteredMachines.length === 0 ? (
                      <div className="text-center py-12 border border-border/30 rounded-lg backdrop-blur-sm bg-background/40">
                        <p className="font-mono text-sm text-muted-foreground">
                          {searchQuery ? 'No machines found matching your search' : 'No active machines yet'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMachines.map((machine) => (
                          <div
                            key={machine.id}
                            onClick={() => router.push(`/admin/machines/active/${machine.id}`)}
                            className="group relative p-6 border border-border/30 rounded-xl backdrop-blur-sm bg-background/40 hover:border-accent/50 hover:bg-background/60 transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-mono text-lg font-semibold text-foreground mb-1 truncate">
                                  {machine.title}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider px-2 py-0.5 border border-border/30 rounded">
                                    {machine.category}
                                  </span>
                                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider px-2 py-0.5 border border-border/30 rounded">
                                    {machine.type}
                                  </span>
                                  {!machine.isActive && (
                                    <span className="font-mono text-[9px] text-destructive uppercase tracking-wider px-2 py-0.5 border border-destructive/30 rounded">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs text-muted-foreground">Score</span>
                                <span className="font-mono text-sm font-semibold text-accent">{machine.score}</span>
                              </div>
                              {machine.containerImage && (
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs text-muted-foreground">Image</span>
                                  <span className="font-mono text-xs text-foreground truncate max-w-[200px]" title={machine.containerImage}>
                                    {machine.containerImage}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs text-muted-foreground">Max Attempts</span>
                                <span className="font-mono text-xs text-foreground">
                                  {machine.maxAttempts === null ? 'Unlimited' : machine.maxAttempts}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-border/20">
                              <Button
                                onClick={() => {
                                  setSelectedMachine(machine);
                                  setIsEditOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="flex-1 font-mono text-xs"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleToggleActive(machine.id, machine.isActive)}
                                variant="outline"
                                size="sm"
                                className={`font-mono text-xs ${
                                  machine.isActive
                                    ? 'text-muted-foreground hover:text-foreground'
                                    : 'text-accent hover:text-accent'
                                }`}
                                title={machine.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {machine.isActive ? (
                                  <PowerOff className="h-3 w-3" />
                                ) : (
                                  <Power className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedMachine(machine);
                                  setIsDeleteOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="font-mono text-xs text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-xl border-border/30 bg-background/50 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm font-semibold">
              Delete Machine
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              Are you sure you want to delete "{selectedMachine?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="flex-1 font-mono text-xs"
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedMachine(null);
              }}
              variant="outline"
              className="flex-1 font-mono text-xs"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

ManageActiveMachines.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default ManageActiveMachines;
