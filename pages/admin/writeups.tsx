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
import { matches, downloadFile } from '@/lib/admin-ui';
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
import toast from 'react-hot-toast';
import { Download, Search } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Writeup {
  id: string;
  userId: string;
  machineId: string;
  title: string;
  content: string;
  attachmentUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  machine: {
    id: string;
    title: string;
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

const WriteupManagement: NextPageWithLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWriteup, setSelectedWriteup] = useState<Writeup | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const { data: writeupsData, mutate } = useSWR<{
    data: { writeups: Writeup[] };
  }>('/api/admin/writeups', fetcher);

  const writeups = writeupsData?.data?.writeups || [];
  const needle = searchQuery.toLowerCase();
  const filteredWriteups = writeups.filter((writeup) => {
    const matchesSearch =
      matches(writeup.title, needle) ||
      matches(writeup.user?.name, needle) ||
      matches(writeup.machine?.title, needle);
    const matchesStatus =
      statusFilter === 'all' || writeup.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pending = writeups.filter((w) => w.status === 'pending').length;

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedWriteup) return;

    try {
      const response = await fetch(
        `/api/admin/writeups/${selectedWriteup.id}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            comment: reviewComment.trim() || undefined,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message || '라이트업 검토에 실패했습니다'
        );
      }

      toast.success(status === 'approved' ? '승인했습니다' : '반려했습니다');
      setIsReviewDialogOpen(false);
      setSelectedWriteup(null);
      setReviewComment('');
      mutate();
    } catch (error: any) {
      toast.error(error.message || '라이트업 검토에 실패했습니다');
    }
  };

  return (
    <>
      <Head>
        <title>Writeups - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Writeups" description="제출된 라이트업 검토">
        <StatBar
          stats={[
            { label: 'Total', value: writeups.length },
            { label: 'Pending', value: pending },
            { label: 'Showing', value: filteredWriteups.length },
          ]}
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="제목, 작성자, 머신으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${adminInputClass} pl-9`}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-auto w-32 border-[var(--warp-rule)] bg-transparent text-[11px] uppercase tracking-[0.12em]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() =>
              downloadFile(
                '/api/admin/writeups/download',
                `writeups-${new Date().toISOString()}.zip`,
                (m) => toast.error(m),
                (m) => toast.success(m)
              )
            }
            className={adminButtonClass}
          >
            <Download className="h-3 w-3" />
            All
          </button>
        </div>

        {filteredWriteups.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">
            해당하는 라이트업이 없습니다.
          </p>
        ) : (
          <ul className="mt-6 border-t border-[var(--warp-rule)]">
            {filteredWriteups.map((writeup) => (
              <li
                key={writeup.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--warp-rule)] py-3"
              >
                {/* Emphasis follows what needs doing: pending is the only state
                    that asks the operator for something, so it is the one that
                    reads at full brightness. */}
                <span
                  className={`w-20 shrink-0 text-[10px] uppercase tracking-[0.14em] ${
                    writeup.status === 'pending'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {writeup.status}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {writeup.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {writeup.user?.name ?? 'Unknown'}
                </span>
                {writeup.machine && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {writeup.machine.title}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWriteup(writeup);
                    setReviewComment('');
                    setIsReviewDialogOpen(true);
                  }}
                  className={adminButtonClass}
                >
                  Review
                </button>
                {writeup.attachmentUrl && (
                  <a
                    href={writeup.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={adminButtonClass}
                  >
                    <Download className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminLayout>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              Review writeup
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedWriteup?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedWriteup && (
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto overscroll-contain border-y border-[var(--warp-rule)] py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {selectedWriteup.content}
                </p>
              </div>
              <input
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="코멘트 (선택)"
                className={adminInputClass}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReviewDialogOpen(false)}
                  className={adminButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('rejected')}
                  className={adminButtonClass}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('approved')}
                  className={adminButtonPrimaryClass}
                >
                  Approve
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

WriteupManagement.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default WriteupManagement;
