import { type ReactElement, useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
// (중복 Input import 제거)
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
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
import { AnimatedNoise } from '@/components/animated-noise';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import { UserRole } from '@prisma/client';
import Head from 'next/head';
// (중복 import 제거)
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import { Input } from '@/components/ui/input';
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

// 비밀번호 변경 다이얼로그 컴포넌트
function ChangePasswordDialog({ userId, userName }: { userId: string, userName: string }) {
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
        <Button variant="outline" size="xs" className="w-full font-mono text-xs" type="button">
          비밀번호 변경
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="space-y-3">
          <div className="font-mono text-sm">{userName}의 새 비밀번호 입력</div>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            minLength={6}
            className="font-mono text-sm"
            disabled={loading}
          />
          {error && <div className="text-red-500 font-mono text-xs">{error}</div>}
          <Button
            onClick={handleChangePassword}
            disabled={loading || password.length < 6}
            className="w-full font-mono text-xs"
          >
            {loading ? '변경 중...' : '비밀번호 저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AdminUsers: NextPageWithLayout<AdminUsersProps> = ({ initialUsers, initialPagination }) => {
  const { t } = useTranslation('common');
  const [users, setUsers] = useState(initialUsers);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&page=1&limit=50`);
      const data = (await response.json()) as UserListApiResponse;
      if (data.data) {
        setUsers(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      toast.error('사용자 검색에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiResponse;
        toast.error(json.error?.message || '사용자 권한 변경에 실패했습니다');
        return;
      }

      // Update local state
      setUsers(users.map((user) => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast.success('User role updated successfully');
    } catch (error) {
      toast.error('사용자 권한 변경에 실패했습니다');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case UserRole.LAB:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case UserRole.USER:
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <>
      <Head>
        <title>Admin - User Management</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Admin - User Management
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="space-y-2">
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    USER MANAGEMENT
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    Manage user roles and permissions
                  </p>
                </div>

                {/* Search */}
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch();
                          }
                        }}
                        className="font-mono text-sm pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                      onClick={handleSearch}
                      disabled={loading}
                      className="font-mono text-xs uppercase tracking-wider"
                    >
                      {loading ? 'Loading...' : 'Search'}
                    </Button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs uppercase tracking-wider">Name</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider">Email</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider">Role</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider">Points</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider">Joined</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">{user.name}</TableCell>
                          <TableCell className="font-mono text-sm">{user.email}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-mono uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{numberFormatter.format(user.totalPoints)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {dateFormatter.format(new Date(user.createdAt))}
                          </TableCell>
                          <TableCell className="space-y-2">
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                            >
                              <SelectTrigger className="w-32 font-mono text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={UserRole.USER}>USER</SelectItem>
                                <SelectItem value={UserRole.LAB}>LAB</SelectItem>
                                <SelectItem value={UserRole.ADMIN}>ADMIN</SelectItem>
                              </SelectContent>
                            </Select>
                            <ChangePasswordDialog userId={user.id} userName={user.name} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={async () => {
                          const response = await fetch(`/api/admin/users?page=${pagination.page - 1}&limit=${pagination.limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
                          const data = (await response.json()) as UserListApiResponse;
                          if (data.data) {
                            setUsers(data.data);
                            if (data.pagination) {
                              setPagination(data.pagination);
                            }
                          }
                        }}
                        className="font-mono text-xs uppercase tracking-wider"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === pagination.totalPages}
                        onClick={async () => {
                          const response = await fetch(`/api/admin/users?page=${pagination.page + 1}&limit=${pagination.limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
                          const data = (await response.json()) as UserListApiResponse;
                          if (data.data) {
                            setUsers(data.data);
                            if (data.pagination) {
                              setPagination(data.pagination);
                            }
                          }
                        }}
                        className="font-mono text-xs uppercase tracking-wider"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
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
