import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StatBar } from '@/components/layouts/StatBar';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
  adminSectionHeadingClass,
} from '@/components/admin/styles';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { Play, RefreshCw } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TestRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
  trigger: string;
  commit: string | null;
  branch: string | null;
  passedCount: number;
  failedCount: number;
  skipCount: number;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<TestRun['status'], string> = {
  PENDING: '대기중',
  RUNNING: '실행중',
  PASSED: '성공',
  FAILED: '실패',
  ERROR: '오류',
};

/**
 * A failed run is the one state that is genuinely a warning, so it is the only
 * one that takes `destructive`. The rest are ordinary states and are told apart
 * by brightness — the finished run reads brighter than the one still queued.
 */
function statusClass(status: TestRun['status']) {
  if (status === 'FAILED' || status === 'ERROR') return 'text-destructive';
  if (status === 'PASSED') return 'text-foreground';
  return 'text-muted-foreground';
}

const formatDuration = (sec: number | null) =>
  sec == null
    ? '—'
    : sec < 60
      ? `${sec}s`
      : `${Math.floor(sec / 60)}m ${sec % 60}s`;

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  if (!isAdmin(user.role)) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

const TestRunsPage: NextPageWithLayout = () => {
  const [triggering, setTriggering] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, mutate } = useSWR<{ data: { runs: TestRun[]; total: number } }>(
    '/api/admin/test-runs?limit=30',
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: detailData } = useSWR<{ data: TestRun & { results: any } }>(
    selected ? `/api/admin/test-runs/${selected}` : null,
    fetcher
  );

  const runs = data?.data?.runs ?? [];
  const detail = detailData?.data;
  const suites = detail?.results?.suites ?? [];
  const latest = runs[0];

  const triggerRun = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/admin/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('테스트 실행이 시작됐습니다.');
      mutate();
    } catch {
      toast.error('테스트 실행 시작에 실패했습니다.');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <>
      <Head>
        <title>Test runs - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Test runs" description="CI/CD 테스트 실행 기록">
        <StatBar
          stats={[
            { label: 'Runs', value: data?.data?.total ?? 0 },
            {
              label: 'Latest',
              value: latest ? STATUS_LABEL[latest.status] : '—',
              mono: false,
            },
            { label: 'Passed', value: latest?.passedCount ?? '—' },
            { label: 'Failed', value: latest?.failedCount ?? '—' },
          ]}
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => mutate()}
            className={adminButtonClass}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
          <button
            type="button"
            onClick={triggerRun}
            disabled={triggering}
            className={adminButtonPrimaryClass}
          >
            <Play className="h-3 w-3" />
            {triggering ? '실행 중...' : 'Run'}
          </button>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:gap-12">
          <section className="min-w-0">
            <h2 className={adminSectionHeadingClass}>Runs</h2>
            {runs.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">
                테스트 실행 기록이 없습니다.
              </p>
            ) : (
              <ul className="max-h-[30rem] overflow-y-auto overscroll-contain pr-1">
                {runs.map((run) => (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected(selected === run.id ? null : run.id)
                      }
                      className={`flex w-full items-baseline gap-3 border-b border-[var(--warp-rule)] px-2 py-2.5 text-left text-sm transition-colors -mx-2 ${
                        selected === run.id
                          ? 'bg-[var(--warp-veil)]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <span
                        className={`w-14 shrink-0 text-[10px] uppercase tracking-[0.14em] ${statusClass(run.status)}`}
                      >
                        {STATUS_LABEL[run.status] ?? run.status}
                      </span>
                      <span className="w-14 shrink-0 truncate text-xs capitalize text-muted-foreground">
                        {run.trigger}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {run.branch ?? '—'}
                        {run.commit && (
                          <span className="warp-num ml-2">
                            {run.commit.slice(0, 7)}
                          </span>
                        )}
                      </span>
                      <span className="warp-num shrink-0 text-xs text-foreground">
                        {run.passedCount}
                      </span>
                      <span
                        className={`warp-num shrink-0 text-xs ${
                          run.failedCount > 0
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {run.failedCount}
                      </span>
                      <span className="warp-num w-14 shrink-0 text-right text-xs text-muted-foreground">
                        {formatDuration(run.duration)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0">
            <h2 className={adminSectionHeadingClass}>Detail</h2>
            {!selected ? (
              <p className="py-8 text-sm text-muted-foreground">
                실행을 선택하면 상세 결과가 나옵니다.
              </p>
            ) : !detail ? (
              <p className="py-8 text-sm text-muted-foreground">로딩 중...</p>
            ) : (
              <div className="mt-4">
                <StatBar
                  stats={[
                    { label: 'Passed', value: detail.passedCount },
                    { label: 'Failed', value: detail.failedCount },
                    { label: 'Time', value: formatDuration(detail.duration) },
                  ]}
                />
                {suites.length > 0 && (
                  <ul className="mt-4 max-h-80 overflow-y-auto overscroll-contain pr-1">
                    {suites.map((suite: any, i: number) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-2 border-b border-[var(--warp-rule)] py-1.5 text-xs"
                      >
                        <span className="min-w-0 truncate text-muted-foreground">
                          {suite.file?.split('/').slice(-2).join('/') ??
                            suite.file}
                        </span>
                        <span className="warp-num shrink-0">
                          <span className="text-foreground">
                            {suite.passed}
                          </span>
                          {suite.failed > 0 && (
                            <span className="ml-2 text-destructive">
                              {suite.failed}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      </AdminLayout>
    </>
  );
};

TestRunsPage.getLayout = function getLayout(page: ReactElement) {
  return page;
};

export default TestRunsPage;
