import { type ReactElement, useState, useEffect } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import Head from 'next/head';
import { Code2, Play, Square, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('불러오기에 실패했습니다');
    return r.json();
  });

type ConnectionInfo = {
  host: string;
  port: number;
  password: string;
  containerName: string;
};

const CloudIDEPage: NextPageWithLayout = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runPassword, setRunPassword] = useState('');
  const [launching, setLaunching] = useState(false);
  const [stopping, setStopping] = useState(false);

  const { data: statusData, mutate: mutateStatus } = useSWR<{
    data: { host: string; port: number; password: string; containerName: string } | null;
  }>('/api/cloud-ide/status', fetcher);

  useEffect(() => {
    const d = statusData?.data;
    if (d) {
      setConnectionInfo({
        host: d.host,
        port: d.port,
        password: d.password,
        containerName: d.containerName,
      });
    } else if (statusData && !d) {
      setConnectionInfo(null);
    }
  }, [statusData]);

  const openRunModal = () => {
    setRunPassword('');
    setRunModalOpen(true);
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setRunModalOpen(false);
    try {
      const res = await fetch('/api/cloud-ide/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(runPassword.trim() ? { password: runPassword.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.error?.detail ?? data?.error?.message;
        throw new Error(typeof detail === 'string' ? detail : 'Launch failed');
      }
      setConnectionInfo({
        host: data.host ?? 'localhost',
        port: data.port,
        password: data.password ?? '',
        containerName: data.containerName ?? `cloud-ide-${data.port}`,
      });
      mutateStatus();
      toast.success('Cloud IDE가 실행되었습니다.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '실행에 실패했습니다.');
    } finally {
      setLaunching(false);
    }
  };

  const handleStop = async () => {
    if (!connectionInfo) return;
    setStopping(true);
    try {
      const res = await fetch('/api/cloud-ide/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ containerName: connectionInfo.containerName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message ?? 'Stop failed');
      setConnectionInfo(null);
      mutateStatus();
      toast.success('Cloud IDE가 중지되었습니다.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '중지에 실패했습니다.');
    } finally {
      setStopping(false);
    }
  };

  const ideUrl = connectionInfo
    ? `http://${connectionInfo.host}:${connectionInfo.port}`
    : null;

  return (
    <>
      <Head>
        <title>Cloud IDE - HUB ACADEMY</title>
      </Head>

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
                    <BreadcrumbLink href="/dashboard" className="font-mono text-xs uppercase tracking-wider">
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                      Cloud IDE
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full space-y-5">
              <section className="rounded-xl border border-border/40 bg-card p-5 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h1 className="font-mono text-2xl md:text-3xl text-foreground uppercase">Cloud IDE</h1>
                    <p className="font-mono text-xs text-muted-foreground mt-2">
                      code-server 기반 개발 환경을 실행하고 브라우저에서 바로 접속합니다.
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center border border-border/40 bg-muted/30">
                    <Code2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">Status</p>
                    <p className="font-mono text-sm text-foreground mt-1">{connectionInfo ? 'Running' : 'Stopped'}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">Host</p>
                    <p className="font-mono text-sm text-foreground mt-1 truncate">{connectionInfo?.host || '-'}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">Port</p>
                    <p className="font-mono text-sm text-foreground mt-1">{connectionInfo ? String(connectionInfo.port) : '-'}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">Container</p>
                    <p className="font-mono text-sm text-foreground mt-1 truncate">{connectionInfo?.containerName || '-'}</p>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,22rem)_1fr] gap-5">
                <Card className="border-border/40 bg-card/70 p-4 space-y-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Launch Settings</p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-1">Run 시 사용 가능한 포트를 자동으로 할당합니다.</p>
                  </div>

                  {!connectionInfo ? (
                    <Button
                      size="sm"
                      className="font-mono"
                      disabled={launching}
                      onClick={openRunModal}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {launching ? '실행 중…' : 'Run Cloud IDE'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="font-mono"
                      disabled={stopping}
                      onClick={handleStop}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      {stopping ? '중지 중…' : 'Stop'}
                    </Button>
                  )}
                </Card>

                <Card className="border-border/40 bg-card/70 overflow-hidden">
                  <div className="p-5 border-b border-border/30 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="font-mono font-semibold text-foreground">Connection Panel</h2>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">
                        {connectionInfo ? '연결 가능한 상태입니다.' : '아직 실행 중인 IDE가 없습니다.'}
                      </p>
                    </div>
                    {connectionInfo && (
                      <Button size="sm" className="font-mono" asChild>
                        <a href={ideUrl!} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          IDE 열기
                        </a>
                      </Button>
                    )}
                  </div>

                  {connectionInfo ? (
                    <div className="p-5 space-y-4">
                      <div className="rounded-lg border border-border/40 bg-muted/20 p-4 font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">URL</span>
                          <a
                            href={ideUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:underline break-all"
                          >
                            {ideUrl}
                          </a>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Password</span>
                          <span className="text-foreground font-mono">{connectionInfo.password}</span>
                        </div>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        URL 접속 후 비밀번호를 입력하면 VS Code 환경이 열립니다.
                      </p>
                    </div>
                  ) : (
                    <div className="p-6">
                      <p className="font-mono text-sm text-muted-foreground">
                        Run을 누르면 <strong className="text-foreground">cloud-ide</strong> 컨테이너가 시작되고 code-server에 접속할 수 있습니다.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>

          <Dialog open={runModalOpen} onOpenChange={setRunModalOpen}>
            <DialogContent className="font-mono max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-mono text-lg uppercase tracking-wider">
                  Run Cloud IDE
                </DialogTitle>
                <DialogDescription className="font-mono text-xs text-muted-foreground">
                  포트는 자동으로 할당됩니다. 비밀번호를 비우면 자동 생성됩니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="cloudide-password" className="font-mono text-xs">
                    Password (선택, 비우면 자동 생성)
                  </Label>
                  <Input
                    id="cloudide-password"
                    type="text"
                    placeholder="비워두면 자동 생성"
                    value={runPassword}
                    onChange={(e) => setRunPassword(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="font-mono" onClick={() => setRunModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="font-mono" onClick={handleLaunch}>
                  Run
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </SidebarProvider>
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

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

CloudIDEPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default CloudIDEPage;
