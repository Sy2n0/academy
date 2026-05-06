import { type ReactElement, useState } from 'react';
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
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { Flag, Plus, Trash2, Search, Server } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Machine {
  id: string;
  title: string;
  type: string;
}

interface MachineFlag {
  id: string;
  flag: string;
  teamId: string | null;
  userId: string | null;
  isStatic: boolean;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  team?: {
    id: string;
    name: string;
    slug: string;
  } | null;
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

const FlagManagement: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFlags, setNewFlags] = useState<string[]>(['']);
  const [flagTemplate, setFlagTemplate] = useState('flag{xxx}');

  const { data: machinesData } = useSWR<{ data: { machines: Machine[] } }>(
    '/api/admin/machines/active',
    fetcher
  );

  const { data: flagsData, mutate: mutateFlags } = useSWR<{
    data: { flags: MachineFlag[] };
  }>(
    selectedMachineId ? `/api/admin/machines/${selectedMachineId}/flags` : null,
    fetcher
  );

  const machines = machinesData?.data?.machines || [];
  const flags = flagsData?.data?.flags || [];

  const handleAddFlag = () => {
    setNewFlags(['']);
    setFlagTemplate('flag{xxx}');
    setIsAddDialogOpen(true);
  };

  const handleAddFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId) {
      toast.error('Please select a machine first');
      return;
    }

    const filteredFlags = newFlags.filter((f) => f.trim());
    const template = flagTemplate.trim();

    // Flag Template 또는 Static Flags 중 하나는 필수
    if (filteredFlags.length === 0 && !template) {
      toast.error('Please enter at least one flag or a flag template');
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/machines/${selectedMachineId}/flags`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flags: filteredFlags.length > 0 ? filteredFlags : undefined,
            flagTemplate: template || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '플래그 추가에 실패했습니다');
      }

      toast.success(result.data?.message || 'Flags updated successfully');
      setIsAddDialogOpen(false);
      setNewFlags(['']);
      setFlagTemplate('flag{xxx}');
      mutateFlags();
    } catch (error: any) {
      toast.error(error.message || '플래그 추가에 실패했습니다');
    }
  };

  const handleDeleteFlag = async (flagId: string) => {
    if (!confirm('Are you sure you want to delete this flag?')) return;

    try {
      const response = await fetch(
        `/api/admin/machines/${selectedMachineId}/flags`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flagId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '플래그 삭제에 실패했습니다');
      }

      toast.success('Flag deleted successfully');
      mutateFlags();
    } catch (error: any) {
      toast.error(error.message || '플래그 삭제에 실패했습니다');
    }
  };

  const addFlagInput = () => {
    setNewFlags([...newFlags, '']);
  };

  const removeFlagInput = (index: number) => {
    setNewFlags(newFlags.filter((_, i) => i !== index));
  };

  const updateFlagInput = (index: number, value: string) => {
    const updated = [...newFlags];
    updated[index] = value;
    setNewFlags(updated);
  };

  return (
    <>
      <Head>
        <title>Flag Management - Admin - HUB ACADEMY</title>
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
                          Flag Management
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
                          FLAG MANAGEMENT
                        </h1>
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                          Manage Machine Flags
                        </p>
                      </div>
                      <Button
                        onClick={handleAddFlag}
                        disabled={!selectedMachineId}
                        className="font-mono text-xs uppercase tracking-wider"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Flags
                      </Button>
                    </div>

                    {/* Machine Selection */}
                    <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                      <Label className="font-mono text-sm font-semibold mb-3 block">
                        Select Machine
                      </Label>
                      <Select
                        value={selectedMachineId}
                        onValueChange={setSelectedMachineId}
                      >
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Choose a machine..." />
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine.title} ({machine.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Flags Statistics */}
                    {selectedMachineId && flags.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 p-3">
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Total Flags
                          </p>
                          <p className="font-mono text-lg font-bold text-foreground">
                            {flags.length}
                          </p>
                        </div>
                        <div className="border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 p-3">
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Static Flags
                          </p>
                          <p className="font-mono text-lg font-bold text-accent">
                            {flags.filter(f => f.isStatic).length}
                          </p>
                        </div>
                        <div className="border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 p-3">
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Dynamic Flags
                          </p>
                          <p className="font-mono text-lg font-bold text-purple-500">
                            {flags.filter(f => !f.isStatic).length}
                          </p>
                        </div>
                        <div className="border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 p-3">
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Active Users/Teams
                          </p>
                          <p className="font-mono text-lg font-bold text-cyan-500">
                            {new Set(flags.filter(f => !f.isStatic).map(f => f.userId || f.teamId).filter(Boolean)).size}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Flags List */}
                    {selectedMachineId && (
                      <div className="border-2 border-border/50 rounded-xl backdrop-blur-sm bg-background/60 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="font-mono text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                            <Flag className="h-4 w-4" />
                            Flags ({flags.length})
                          </h2>
                          {flags.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const staticFlags = flags.filter(f => f.isStatic);
                                  const dynamicFlags = flags.filter(f => !f.isStatic);
                                  const csv = [
                                    ['Type', 'Flag', 'User/Team', 'Email', 'Created At'],
                                    ...staticFlags.map(f => ['STATIC', f.flag, 'N/A', 'N/A', new Date(f.createdAt).toLocaleString()]),
                                    ...dynamicFlags.map(f => [
                                      'DYNAMIC',
                                      f.flag,
                                      f.team?.name || f.user?.name || 'N/A',
                                      f.user?.email || 'N/A',
                                      new Date(f.createdAt).toLocaleString()
                                    ])
                                  ].map(row => row.join(',')).join('\n');
                                  const blob = new Blob([csv], { type: 'text/csv' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `flags-${selectedMachineId}-${Date.now()}.csv`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="font-mono text-xs uppercase tracking-wider"
                              >
                                Export CSV
                              </Button>
                            </div>
                          )}
                        </div>

                        {flags.length === 0 ? (
                          <p className="font-mono text-sm text-muted-foreground text-center py-8">
                            No flags found. Add flags to get started.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {flags.map((flag) => (
                              <div
                                key={flag.id}
                                className="flex items-center justify-between p-3 border border-border/30 rounded-lg bg-background/40"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <code className="font-mono text-sm font-semibold text-foreground break-all">
                                      {flag.flag}
                                    </code>
                                    {flag.isStatic ? (
                                      <span className="font-mono text-[9px] text-accent uppercase tracking-wider px-2 py-0.5 border border-accent/30 rounded bg-accent/10">
                                        STATIC
                                      </span>
                                    ) : (
                                      <span className="font-mono text-[9px] text-purple-500 uppercase tracking-wider px-2 py-0.5 border border-purple-500/30 rounded bg-purple-500/10">
                                        DYNAMIC
                                      </span>
                                    )}
                                    {flag.team && (
                                      <span className="font-mono text-[9px] text-cyan-500 uppercase tracking-wider px-2 py-0.5 border border-cyan-500/30 rounded bg-cyan-500/10">
                                        Team: {flag.team.name}
                                      </span>
                                    )}
                                    {flag.user && (
                                      <span className="font-mono text-[9px] text-blue-500 uppercase tracking-wider px-2 py-0.5 border border-blue-500/30 rounded bg-blue-500/10">
                                        User: {flag.user.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <p className="font-mono text-[10px] text-muted-foreground">
                                      Created: {new Date(flag.createdAt).toLocaleString()}
                                    </p>
                                    {flag.user && (
                                      <p className="font-mono text-[10px] text-muted-foreground">
                                        Email: {flag.user.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFlag(flag.id)}
                                  className="font-mono text-xs text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      {/* Add Flag Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[var(--font-bebas)] text-2xl tracking-tight text-foreground" style={{ fontStyle: 'italic' }}>
              Add Flags
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              Add static flags or configure flag template for dynamic flags
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFlagSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="font-mono text-sm mb-2 block">
                Flag Template (for dynamic flags)
              </Label>
              <Input
                value={flagTemplate}
                onChange={(e) => setFlagTemplate(e.target.value)}
                placeholder="flag{xxx}"
                className="font-mono"
              />
            </div>
            <div>
              <Label className="font-mono text-sm mb-2 block">
                Static Flags
              </Label>
              <div className="space-y-2">
                {newFlags.map((flag, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={flag}
                      onChange={(e) => updateFlagInput(index, e.target.value)}
                      placeholder="flag{...}"
                      className="font-mono flex-1"
                    />
                    {newFlags.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFlagInput(index)}
                        className="font-mono text-xs"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFlagInput}
                  className="font-mono text-xs w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Flag
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="font-mono text-xs uppercase tracking-wider flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="font-mono text-xs uppercase tracking-wider flex-1 bg-accent hover:bg-accent/90 text-foreground"
              >
                Add Flags
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

FlagManagement.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default FlagManagement;
