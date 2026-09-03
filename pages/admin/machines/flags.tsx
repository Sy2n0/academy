import { type ReactElement, useState } from 'react';
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
import { toCsv } from '@/lib/admin-ui';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import useSWR from 'swr';

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

  const exportCsv = () => {
    const csv = toCsv([
      ['Type', 'Flag', 'User/Team', 'Email', 'Created At'],
      ...flags.map((f) => [
        f.isStatic ? 'STATIC' : 'DYNAMIC',
        f.flag,
        f.team?.name || f.user?.name || '',
        f.user?.email || '',
        new Date(f.createdAt).toISOString(),
      ]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `flags-${selectedMachineId}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>Flags - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Flags" description="머신별 플래그 관리">
        <div className="max-w-sm">
          <label className={adminLabelClass}>Machine</label>
          <Select
            value={selectedMachineId}
            onValueChange={setSelectedMachineId}
          >
            <SelectTrigger className="border-[var(--warp-rule)] bg-transparent text-sm">
              <SelectValue placeholder="머신을 선택하세요" />
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

        {selectedMachineId && (
          <>
            <div className="mt-6">
              <StatBar
                stats={[
                  { label: 'Flags', value: flags.length },
                  {
                    label: 'Static',
                    value: flags.filter((f) => f.isStatic).length,
                  },
                  {
                    label: 'Dynamic',
                    value: flags.filter((f) => !f.isStatic).length,
                  },
                  {
                    label: 'Holders',
                    value: new Set(
                      flags
                        .filter((f) => !f.isStatic)
                        .map((f) => f.userId || f.teamId)
                        .filter(Boolean)
                    ).size,
                  },
                ]}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {flags.length > 0 && (
                <button
                  type="button"
                  onClick={exportCsv}
                  className={adminButtonClass}
                >
                  CSV
                </button>
              )}
              <button
                type="button"
                onClick={handleAddFlag}
                className={adminButtonPrimaryClass}
              >
                <Plus className="h-3 w-3" />
                Flags
              </button>
            </div>

            {flags.length === 0 ? (
              <p className="py-10 text-sm text-muted-foreground">
                등록된 플래그가 없습니다.
              </p>
            ) : (
              <ul className="mt-4 border-t border-[var(--warp-rule)]">
                {flags.map((flag) => (
                  <li
                    key={flag.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--warp-rule)] py-2.5"
                  >
                    {/* STATIC and DYNAMIC were tinted accent and purple, team
                        and user cyan and blue — four hues for four categories
                        with no order between them. The word is the label. */}
                    <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {flag.isStatic ? 'Static' : 'Dynamic'}
                    </span>
                    <code className="warp-num min-w-0 flex-1 break-all text-sm text-foreground">
                      {flag.flag}
                    </code>
                    {(flag.team || flag.user) && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {flag.team ? `Team ${flag.team.name}` : flag.user?.name}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteFlag(flag.id)}
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </AdminLayout>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              Add flags
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              고정 플래그를 넣거나, 사용자별로 생성될 템플릿을 지정합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFlagSubmit} className="space-y-4">
            <div>
              <label className={adminLabelClass}>Flag template (dynamic)</label>
              <input
                value={flagTemplate}
                onChange={(e) => setFlagTemplate(e.target.value)}
                placeholder="flag{xxx}"
                className={`${adminInputClass} warp-num`}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Static flags</label>
              <div className="space-y-2">
                {newFlags.map((flag, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={flag}
                      onChange={(e) => updateFlagInput(index, e.target.value)}
                      placeholder="flag{...}"
                      className={`${adminInputClass} warp-num flex-1`}
                    />
                    {newFlags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFlagInput(index)}
                        className="rounded p-2 text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFlagInput}
                  className={`${adminButtonClass} w-full`}
                >
                  <Plus className="h-3 w-3" />
                  Another
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--warp-rule)] pt-4">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className={adminButtonClass}
              >
                Cancel
              </button>
              <button type="submit" className={adminButtonPrimaryClass}>
                Add
              </button>
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
