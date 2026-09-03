import { type ReactElement, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StatBar } from '@/components/layouts/StatBar';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
  adminInputClass,
} from '@/components/admin/styles';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { UserRole } from '@prisma/client';
import Head from 'next/head';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import { Search } from 'lucide-react';

type AdminUsersProps = InferGetServerSidePropsType<typeof getServerSideProps>;
type UserListApiResponse = ApiResponse<any> & {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function ChangePasswordDialog({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'Failed to change password');
      }
      toast.success('비밀번호가 변경되었습니다');
      setOpen(false);
      setPassword('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={adminButtonClass}>
          Password
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {/* The dialog had no title at all, so screen readers announced an
            unlabelled window and Radix logged a missing-Description warning. */}
        <DialogHeader>
          <DialogTitle className="text-base font-normal">
            {userName} 비밀번호 변경
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            minLength={6}
            className={adminInputClass}
            disabled={loading}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={loading || password.length < 6}
            className={`${adminButtonPrimaryClass} w-full`}
          >
            {loading ? '변경 중...' : '저장'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AdminUsers: NextPageWithLayout<AdminUsersProps> = ({
  initialUsers,
  initialPagination,
}) => {
  const [users, setUsers] = useState(initialUsers);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Search and both pagination buttons had a copy of this fetch each — three
  // call sites, three chances for the query string to drift apart.
  const load = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users?page=${page}&limit=${pagination.limit}${
          search ? `&search=${encodeURIComponent(search)}` : ''
        }`
      );
      const data = (await response.json()) as UserListApiResponse;
      if (data.data) {
        setUsers(data.data);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch {
      toast.error('사용자를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !isBlocked }),
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiResponse;
        throw new Error(json.error?.message || 'Failed to update user');
      }

      setUsers((prev: any[]) =>
        prev.map((u) => (u.id === userId ? { ...u, isBlocked: !isBlocked } : u))
      );
      toast.success(!isBlocked ? '비활성화했습니다' : '활성화했습니다');
    } catch (error: any) {
      toast.error(error.message || '상태 변경에 실패했습니다');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${pendingDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiResponse;
        throw new Error(json.error?.message || 'Failed to delete user');
      }

      setUsers((prev: any[]) => prev.filter((u) => u.id !== pendingDelete.id));
      setPagination((prev: any) => ({ ...prev, total: prev.total - 1 }));
      toast.success('삭제했습니다');
      setPendingDelete(null);
    } catch (error: any) {
      toast.error(error.message || '삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  };

  const handleRevokeVpn = async () => {
    if (!pendingRevoke) return;
    setRevoking(true);
    try {
      const response = await fetch(`/api/admin/users/${pendingRevoke.id}/vpn`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiResponse;
        throw new Error(json.error?.message || 'Failed to revoke');
      }

      toast.success('VPN 인증서를 폐기했습니다');
      setPendingRevoke(null);
    } catch (error: any) {
      toast.error(error.message || 'VPN 폐기에 실패했습니다');
    } finally {
      setRevoking(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiResponse;
        throw new Error(json.error?.message || 'Failed to update role');
      }

      setUsers((prev: any[]) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success('권한이 변경되었습니다');
    } catch (error: any) {
      toast.error(error.message || '권한 변경에 실패했습니다');
    }
  };

  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <Head>
        <title>Users - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Users" description="계정 권한과 비밀번호">
        <StatBar
          stats={[
            { label: 'Total', value: pagination.total },
            { label: 'Showing', value: `${first}–${last}` },
            {
              label: 'Page',
              value: `${pagination.page}/${pagination.totalPages}`,
            },
          ]}
        />

        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') load(1);
              }}
              className={`${adminInputClass} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => load(1)}
            disabled={loading}
            className={adminButtonClass}
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--warp-rule)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-2 pr-4 text-left font-normal">Name</th>
                <th className="py-2 pr-4 text-left font-normal">Email</th>
                <th className="py-2 pr-4 text-left font-normal">Role</th>
                <th className="py-2 pr-4 text-right font-normal">Points</th>
                <th className="py-2 pr-4 text-left font-normal">Joined</th>
                <th className="py-2 pr-4 text-left font-normal">State</th>
                <th className="py-2 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--warp-rule)]"
                >
                  <td className="py-2.5 pr-4 text-foreground">{user.name}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {user.email}
                  </td>
                  {/* ADMIN was red and LAB was blue — a warning colour and a
                      hue standing in for roles that have no order between
                      them. They are named instead. */}
                  <td className="py-2.5 pr-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {user.role}
                  </td>
                  <td className="warp-num py-2.5 pr-4 text-right text-foreground">
                    {numberFormatter.format(user.totalPoints)}
                  </td>
                  <td className="warp-num py-2.5 pr-4 text-xs text-muted-foreground">
                    {dateFormatter.format(new Date(user.createdAt))}
                  </td>
                  {/* Blocked is the one state here that warns: the account
                      still exists but can no longer sign in. */}
                  <td
                    className={`py-2.5 pr-4 text-[10px] uppercase tracking-[0.14em] ${
                      user.isBlocked
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {user.isBlocked ? 'Blocked' : 'Active'}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value as UserRole)
                        }
                      >
                        <SelectTrigger className="h-7 w-24 border-[var(--warp-rule)] bg-transparent text-[11px] uppercase tracking-[0.12em]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.USER}>USER</SelectItem>
                          <SelectItem value={UserRole.LAB}>LAB</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                      <ChangePasswordDialog
                        userId={user.id}
                        userName={user.name}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleBlock(user.id, user.isBlocked)
                        }
                        className={adminButtonClass}
                      >
                        {user.isBlocked ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingRevoke({ id: user.id, name: user.name })
                        }
                        className={adminButtonClass}
                      >
                        VPN
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingDelete({ id: user.id, name: user.name })
                        }
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

        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="warp-num text-xs text-muted-foreground">
              {first}–{last} / {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page === 1 || loading}
                onClick={() => load(pagination.page - 1)}
                className={adminButtonClass}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={pagination.page === pagination.totalPages || loading}
                onClick={() => load(pagination.page + 1)}
                className={adminButtonClass}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </AdminLayout>

      <Dialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              Revoke VPN certificate
            </DialogTitle>
            {/* Separate from blocking on purpose: the case this covers is a
                leaked .ovpn file, where the account is fine and only the
                credential has to die. */}
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              {pendingRevoke?.name} 의 VPN 인증서를 폐기합니다. 배포된 .ovpn
              파일은 즉시 사용할 수 없게 되고, 본인은 새 파일을 다시 받으면
              됩니다. 계정 자체는 그대로 유지됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setPendingRevoke(null)}
              disabled={revoking}
              className={adminButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevokeVpn}
              disabled={revoking}
              className={`${adminButtonClass} border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive`}
            >
              {revoking ? 'Revoking...' : 'Revoke'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              Delete user
            </DialogTitle>
            {/* Spelled out because the cascade is not obvious from the button:
                every relation carrying a userId goes with the account, so the
                delete also moves everyone else's ranking. */}
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              {pendingDelete?.name} 계정을 삭제합니다. 점수 기록, 문제 풀이,
              제출 내역이 함께 사라지고 다른 사용자의 순위가 바뀝니다. 되돌릴 수
              없습니다.
              <br />
              <br />
              접속만 막으려면 Disable을 쓰세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
              className={adminButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`${adminButtonClass} border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive`}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
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

  // 관리자만 접근 가능
  if (!isAdmin(user.role)) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  // 사용자 목록 조회
  const { page = '1', limit = '50' } = context.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const { prisma } = await import('@/lib/prisma');
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        totalPoints: true,
        currentRank: true,
        isBlocked: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    }),
    prisma.user.count(),
  ]);

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      initialUsers: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      initialPagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  };
}

AdminUsers.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminUsers;
