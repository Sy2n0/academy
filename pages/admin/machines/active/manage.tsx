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
} from '@/components/admin/styles';
import { matches } from '@/lib/admin-ui';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';
import useSWR from 'swr';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<MachinesResponse>(
    '/api/admin/machines/active',
    fetcher
  );

  const machines = data?.data?.machines || [];
  const needle = searchQuery.toLowerCase();
  const filteredMachines = machines.filter(
    (machine) =>
      matches(machine.title, needle) || matches(machine.category, needle)
  );

  const handleDelete = async () => {
    if (!selectedMachine) return;

    try {
      const response = await fetch(
        `/api/admin/machines/active/${selectedMachine.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('머신 삭제에 실패했습니다');
      }

      toast.success('삭제했습니다');
      setIsDeleteOpen(false);
      setSelectedMachine(null);
      mutate();
    } catch (error: any) {
      toast.error(error?.message || '머신 삭제에 실패했습니다');
    }
  };

  const handleToggleActive = async (
    machineId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(
        `/api/admin/machines/active/${machineId}/toggle`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !currentStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('머신 상태 변경에 실패했습니다');
      }

      toast.success(!currentStatus ? '활성화했습니다' : '비활성화했습니다');
      mutate();
    } catch (error: any) {
      toast.error(error?.message || '머신 상태 변경에 실패했습니다');
    }
  };

  return (
    <>
      <Head>
        <title>Active machines - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Active machines" description="실습 머신 목록">
        <StatBar
          stats={[
            { label: 'Machines', value: machines.length },
            {
              label: 'Active',
              value: machines.filter((m) => m.isActive).length,
            },
            { label: 'Showing', value: filteredMachines.length },
          ]}
        />

        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="제목 또는 카테고리로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${adminInputClass} pl-9`}
            />
          </div>
          <Link
            href="/admin/machines/active/create"
            className={adminButtonPrimaryClass}
          >
            <Plus className="h-3 w-3" />
            Machine
          </Link>
        </div>

        {isLoading ? (
          <p className="py-10 text-sm text-muted-foreground">불러오는 중...</p>
        ) : error ? (
          <p className="py-10 text-sm text-destructive">
            머신 목록을 불러오지 못했습니다.
          </p>
        ) : filteredMachines.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">
            {searchQuery ? '검색 결과가 없습니다.' : '머신이 없습니다.'}
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--warp-rule)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-normal">Title</th>
                  <th className="py-2 pr-4 text-left font-normal">Category</th>
                  <th className="py-2 pr-4 text-left font-normal">Image</th>
                  <th className="py-2 pr-4 text-right font-normal">Score</th>
                  <th className="py-2 pr-4 text-right font-normal">Attempts</th>
                  <th className="py-2 pr-4 text-left font-normal">State</th>
                  <th className="py-2 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine) => (
                  <tr
                    key={machine.id}
                    className="border-b border-[var(--warp-rule)]"
                  >
                    {/* The card this replaces put the row navigation on the
                        whole tile, with Edit, Toggle and Delete sitting inside
                        it and no stopPropagation — so pressing Edit navigated
                        away instead. Only the title navigates now. */}
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/admin/machines/active/${machine.id}`}
                        className="text-foreground transition-colors hover:underline"
                      >
                        {machine.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {machine.category}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      <span className="block max-w-[14rem] truncate">
                        {machine.containerImage ?? '—'}
                      </span>
                    </td>
                    <td className="warp-num py-2.5 pr-4 text-right text-foreground">
                      {machine.score}
                    </td>
                    <td className="warp-num py-2.5 pr-4 text-right text-muted-foreground">
                      {machine.maxAttempts === null ? '∞' : machine.maxAttempts}
                    </td>
                    <td className="py-2.5 pr-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {machine.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Edit set an isEditOpen flag that no dialog ever
                            read. It goes to the edit page that already exists. */}
                        <Link
                          href={`/admin/machines/active/${machine.id}/edit`}
                          className={adminButtonClass}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleActive(machine.id, machine.isActive)
                          }
                          className={adminButtonClass}
                        >
                          {machine.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMachine(machine);
                            setIsDeleteOpen(true);
                          }}
                          className={`${adminButtonClass} hover:text-destructive`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminLayout>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              Delete machine
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              &quot;{selectedMachine?.title}&quot; 을(를) 삭제합니다. 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedMachine(null);
              }}
              className={adminButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className={`${adminButtonClass} border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive`}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

ManageActiveMachines.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default ManageActiveMachines;
