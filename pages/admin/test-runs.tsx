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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { CheckCircle, XCircle, Clock, Play, RefreshCw } from 'lucide-react';

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

function StatusBadge({ status }: { status: TestRun['status'] }) {
  const map: Record<
    TestRun['status'],
    {
      label: string;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
    }
  > = {
    PENDING: { label: '대기중', variant: 'secondary' },
    RUNNING: { label: '실행중', variant: 'outline' },
    PASSED: { label: '성공', variant: 'default' },
    FAILED: { label: '실패', variant: 'destructive' },
    ERROR: { label: '오류', variant: 'destructive' },
  };
  const { label, variant } = map[status] ?? {
    label: status,
    variant: 'secondary',
  };
  return <Badge variant={variant}>{label}</Badge>;
}

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
  const { t } = useTranslation('common');
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

  const formatDuration = (sec: number | null) =>
    sec == null
      ? '-'
      : sec < 60
        ? `${sec}s`
        : `${Math.floor(sec / 60)}m ${sec % 60}s`;

  const detail = detailData?.data;
  const suites = detail?.results?.suites ?? [];

  return (
    <>
      <Head>
        <title>테스트 결과 | Admin</title>
      </Head>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AnimatedNoise />
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>테스트 결과</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">CI/CD 테스트 결과</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  총 {data?.data?.total ?? 0}개의 테스트 실행 기록
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  새로고침
                </Button>
                <Button size="sm" onClick={triggerRun} disabled={triggering}>
                  <Play className="h-4 w-4 mr-1" />
                  {triggering ? '실행 중...' : '수동 실행'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Run list */}
              <div className="lg:col-span-2 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상태</TableHead>
                      <TableHead>트리거</TableHead>
                      <TableHead>브랜치/커밋</TableHead>
                      <TableHead className="text-center">통과</TableHead>
                      <TableHead className="text-center">실패</TableHead>
                      <TableHead>소요시간</TableHead>
                      <TableHead>실행시각</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          테스트 실행 기록이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      runs.map((run) => (
                        <TableRow
                          key={run.id}
                          className={`cursor-pointer ${selected === run.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                          onClick={() =>
                            setSelected(selected === run.id ? null : run.id)
                          }
                        >
                          <TableCell>
                            <StatusBadge status={run.status} />
                          </TableCell>
                          <TableCell className="capitalize">
                            {run.trigger}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{run.branch ?? '-'}</div>
                            {run.commit && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {run.commit.slice(0, 7)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-600 font-medium">
                              {run.passedCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                run.failedCount > 0
                                  ? 'text-red-600 font-medium'
                                  : 'text-muted-foreground'
                              }
                            >
                              {run.failedCount}
                            </span>
                          </TableCell>
                          <TableCell>{formatDuration(run.duration)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(run.createdAt).toLocaleString('ko-KR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Detail panel */}
              <div className="rounded-lg border p-4">
                {!selected ? (
                  <p className="text-muted-foreground text-sm text-center mt-8">
                    행을 클릭하면 상세 결과를 확인합니다.
                  </p>
                ) : !detail ? (
                  <p className="text-muted-foreground text-sm text-center mt-8">
                    로딩 중...
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={detail.status} />
                      <span className="text-sm text-muted-foreground capitalize">
                        {detail.trigger}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-green-50 dark:bg-green-950 p-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
                        <div className="font-bold text-green-700">
                          {detail.passedCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          통과
                        </div>
                      </div>
                      <div className="rounded bg-red-50 dark:bg-red-950 p-2">
                        <XCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                        <div className="font-bold text-red-700">
                          {detail.failedCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          실패
                        </div>
                      </div>
                      <div className="rounded bg-muted p-2">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="font-bold">
                          {formatDuration(detail.duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          시간
                        </div>
                      </div>
                    </div>

                    {suites.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">테스트 파일</p>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                          {suites.map((suite: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs rounded p-1 hover:bg-muted"
                            >
                              <span className="truncate font-mono text-muted-foreground max-w-[70%]">
                                {suite.file?.split('/').slice(-2).join('/') ??
                                  suite.file}
                              </span>
                              <span>
                                <span className="text-green-600">
                                  {suite.passed}✓
                                </span>
                                {suite.failed > 0 && (
                                  <span className="text-red-600 ml-1">
                                    {suite.failed}✗
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

TestRunsPage.getLayout = function getLayout(page: ReactElement) {
  return page;
};

export default TestRunsPage;
