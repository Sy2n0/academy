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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import Head from 'next/head';
import { Play, Square, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('불러오기에 실패했습니다');
    return r.json();
  });

type ConnectionInfo = {
  boxName: string;
  host: string;
  port: number;
  port8080: number;
  user: string;
  containerName: string;
};

const BOX_ICON: Record<string, string> = {
  Kali: '/attack-box/kali.png',
  Ubuntu: '/attack-box/ubuntu.png',
  Parrot: '/attack-box/parrot.png',
};

/** Kali Linux 실행 시 사용하는 이미지 식별자 */
const LAUNCH_IMAGE_KALI = '@PLATFORM/HUB-ATTACKBOX/kali-rolling';

/** SSH/Web 접속 안내에 표시할 호스트 주소 */
const ATTACKBOX_DISPLAY_HOST = '144.24.233.94';

const UBUNTU_VERSIONS = [
  { value: '16.04', label: '16.04 LTS (Xenial)' },
  { value: '18.04', label: '18.04 LTS (Bionic)' },
  { value: '20.04', label: '20.04 LTS (Focal)' },
  { value: '22.04', label: '22.04 LTS (Jammy)' },
  { value: '24.04', label: '24.04 LTS (Noble)' },
];

type DetailBox = { name: string; version?: string };

const DETAIL_CONTENT: Record<
  string,
  { description: string; specs: string[]; tools?: string[]; notes?: string }
> = {
  Kali: {
    description:
      'Debian 기반 침투 테스트·보안 감사용 배포판. 수백 개의 보안 도구가 사전 설치되어 있으며, CTF·랩·레드팀 연습에 적합합니다.',
    specs: [
      'Base: Debian (rolling)',
      'Desktop: Xfce',
      'Kernel: Linux 6.x',
      '권장 RAM: 4GB 이상',
      '권장 디스크: 20GB 이상',
    ],
    tools: [
      'Nmap, Wireshark, Burp Suite',
      'Metasploit Framework',
      'John the Ripper, Hashcat',
      'Aircrack-ng, SQLMap',
      'Binwalk, Volatility',
    ],
    notes: '실습 후 연결 정보(호스트/SSH)는 이 패널에 표시됩니다.',
  },
  Ubuntu: {
    description:
      '일반 목적 Linux 배포판. LTS 버전별로 선택 가능하며, 커스텀 도구 설치나 일반 개발·실습 환경으로 사용할 수 있습니다.',
    specs: [
      'Base: Ubuntu LTS',
      'Desktop: 기본 GNOME 또는 서버 이미지',
      '권장 RAM: 2GB 이상 (서버) / 4GB 이상 (데스크톱)',
      '권장 디스크: 10GB 이상',
    ],
    tools: [
      '패키지: apt (Ubuntu 공식 저장소)',
      '추가 도구는 필요 시 직접 설치',
    ],
    notes:
      '버전별 보안 업데이트 및 지원 기간이 다릅니다. 22.04 LTS를 기본 권장합니다.',
  },
  Parrot: {
    description:
      '보안·포렌식·펜테스트에 특화된 가벼운 배포판. MATE 데스크톱과 통합 도구 세트를 제공하며, 리소스 사용이 Kali보다 적습니다.',
    specs: [
      'Base: Debian (rolling)',
      'Desktop: MATE',
      'Kernel: Linux 6.x',
      '권장 RAM: 2GB 이상',
      '권장 디스크: 16GB 이상',
    ],
    tools: [
      'Nmap, Wireshark, Metasploit',
      'MATE 통합 터미널·파일 관리자',
      'AnonSurf, OnionShare',
      '포렌식 도구 (가상화·암호화 지원)',
    ],
    notes:
      'Kali와 유사한 도구 구성이면서 더 가벼운 환경이 필요할 때 적합합니다.',
  },
};

const AttackBoxPage: NextPageWithLayout = () => {
  const [detail, setDetail] = useState<DetailBox | null>(null);
  const [detailUbuntuVersion, setDetailUbuntuVersion] = useState('22.04');
  const [runningDetail, setRunningDetail] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(
    null
  );
  const [stopping, setStopping] = useState(false);
  const [viewMode, setViewMode] = useState<'env' | 'running'>('env');
  const [expandedRunningId, setExpandedRunningId] = useState<string | null>(
    null
  );

  const { data: statusData, mutate: mutateStatus } = useSWR<{
    data: {
      boxName: string;
      host: string;
      port: number;
      port8080: number;
      user: string;
      containerName: string;
    } | null;
  }>('/api/attackbox/status', fetcher);

  useEffect(() => {
    const d = statusData?.data;
    if (d) {
      setConnectionInfo({
        boxName: d.boxName,
        host: d.host,
        port: d.port,
        port8080: d.port8080,
        user: d.user,
        containerName: d.containerName,
      });
    } else if (statusData && !d) {
      setConnectionInfo(null);
    }
  }, [statusData]);

  const showDetail = (box: string) => {
    setViewMode('env');
    setDetail({ name: box });
  };

  const showRunningList = () => {
    setViewMode('running');
    setDetail(null);
  };

  const handleRunFromDetail = async () => {
    if (!detail) return;
    if (detail.name !== 'Kali') {
      toast.error('현재는 Kali 환경만 실행할 수 있습니다.');
      return;
    }

    const label = detail.name;
    const image = LAUNCH_IMAGE_KALI;
    setRunningDetail(label);
    try {
      const res = await fetch('/api/attackbox/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // Auto-port mode: omit port/webPort/username and let API allocate safely.
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.error?.detail ?? data?.error?.message;
        throw new Error(typeof detail === 'string' ? detail : 'Launch failed');
      }
      const actuallyLaunched = data?.launched === true;
      if (
        actuallyLaunched &&
        data?.host != null &&
        data?.port != null &&
        data?.username != null &&
        data?.containerName
      ) {
        setConnectionInfo({
          boxName: detail.name,
          host: data.host,
          port: data.port,
          port8080: data.port8080 ?? data.port + 1,
          user: data.username,
          containerName: data.containerName,
        });
        mutateStatus();
      }
      toast.success(
        actuallyLaunched
          ? `${label} 실행되었습니다.`
          : `${label} 실행 요청이 접수되었습니다. (플랫폼 연동 후 실제 기동됩니다)`
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '실행에 실패했습니다.');
    } finally {
      setRunningDetail(null);
    }
  };

  const handleStop = async (containerName: string) => {
    setStopping(true);
    try {
      const res = await fetch('/api/attackbox/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ containerName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message ?? 'Stop failed');
      setConnectionInfo((prev) =>
        prev?.containerName === containerName ? null : prev
      );
      setExpandedRunningId((prev) => (prev === containerName ? null : prev));
      mutateStatus();
      toast.success('컨테이너가 중지되었습니다.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '중지에 실패했습니다.');
    } finally {
      setStopping(false);
    }
  };

  const isCurrentBoxRunning = detail && connectionInfo?.boxName === detail.name;
  const isRunDisabled = detail?.name !== 'Kali';

  const detailLabel = detail
    ? detail.name === 'Ubuntu'
      ? `${detail.name} ${detailUbuntuVersion}`
      : detail.version
        ? `${detail.name} ${detail.version}`
        : detail.name
    : null;
  const detailContent = detail ? DETAIL_CONTENT[detail.name] : null;

  return (
    <>
      <Head>
        <title>Attack Box - HUB ACADEMY</title>
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
                    <BreadcrumbLink
                      href="/dashboard"
                      className="font-mono text-xs uppercase tracking-wider"
                    >
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                      Attack Box
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full space-y-5">
              <section className="rounded-xl border border-border/40 bg-card p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h1 className="font-mono text-2xl md:text-3xl text-foreground uppercase">
                      Attack Box
                    </h1>
                    <p className="font-mono text-xs text-muted-foreground mt-2">
                      실습용 환경을 실행하고 연결 정보를 확인한 뒤, 필요하면
                      즉시 종료할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === 'env' ? 'default' : 'outline'}
                      className="font-mono text-xs"
                      onClick={() => setViewMode('env')}
                    >
                      Environments
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === 'running' ? 'default' : 'outline'}
                      className="font-mono text-xs"
                      onClick={showRunningList}
                    >
                      Running
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Active
                    </p>
                    <p className="font-mono text-lg text-foreground mt-1">
                      {connectionInfo ? '1' : '0'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Box
                    </p>
                    <p className="font-mono text-sm text-foreground mt-1 truncate">
                      {connectionInfo?.boxName || '-'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      SSH
                    </p>
                    <p className="font-mono text-lg text-foreground mt-1">
                      {connectionInfo ? String(connectionInfo.port) : '-'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/70 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Web
                    </p>
                    <p className="font-mono text-lg text-foreground mt-1">
                      {connectionInfo ? String(connectionInfo.port8080) : '-'}
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,22rem)_1fr] gap-5">
                <Card className="border-border/40 bg-card/70 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/30">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Environment List
                    </p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {[
                      {
                        name: 'Kali' as const,
                        title: 'Kali Linux',
                        desc: 'Penetration testing toolkit',
                      },
                      {
                        name: 'Ubuntu' as const,
                        title: 'Ubuntu',
                        desc: 'General-purpose lab environment',
                      },
                      {
                        name: 'Parrot' as const,
                        title: 'Parrot OS',
                        desc: 'Lightweight pentest and forensics',
                      },
                    ].map((env) => (
                      <div
                        key={env.name}
                        className="px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-md border border-border/40 flex items-center justify-center shrink-0 overflow-hidden bg-muted/30">
                            <img
                              src={BOX_ICON[env.name]}
                              alt={env.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-sm text-foreground">
                              {env.title}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground truncate">
                              {env.desc}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-mono text-xs shrink-0"
                          onClick={() => showDetail(env.name)}
                        >
                          Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Operation Panel
                  </p>
                  {viewMode === 'running' ? (
                    <Card className="border-border/40 bg-card/70 overflow-hidden">
                      <div className="p-5 border-b border-border/30">
                        <h2 className="font-mono font-semibold text-foreground">
                          Running AttackBox
                        </h2>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">
                          Inspect active container details and stop when needed.
                        </p>
                      </div>
                      <div className="divide-y divide-border/30">
                        {connectionInfo ? (
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-border/40 bg-muted/30">
                                  <img
                                    src={
                                      BOX_ICON[
                                        connectionInfo.boxName as keyof typeof BOX_ICON
                                      ] ?? BOX_ICON.Kali
                                    }
                                    alt={connectionInfo.boxName}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-mono font-medium text-foreground">
                                    {connectionInfo.boxName}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground truncate">
                                    {connectionInfo.containerName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="font-mono"
                                  onClick={() =>
                                    setExpandedRunningId((prev) =>
                                      prev === connectionInfo.containerName
                                        ? null
                                        : connectionInfo.containerName
                                    )
                                  }
                                >
                                  {expandedRunningId ===
                                  connectionInfo.containerName ? (
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 mr-1" />
                                  )}
                                  세부 정보
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="font-mono"
                                  disabled={stopping}
                                  onClick={() =>
                                    handleStop(connectionInfo.containerName)
                                  }
                                >
                                  <Square className="h-4 w-4 mr-2" />
                                  {stopping ? '중지 중…' : '종료'}
                                </Button>
                              </div>
                            </div>
                            {expandedRunningId ===
                              connectionInfo.containerName && (
                              <div className="mt-4 rounded-lg border border-border/40 bg-muted/20 p-4 font-mono text-xs space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Host
                                  </span>
                                  <span className="text-foreground">
                                    {ATTACKBOX_DISPLAY_HOST}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Port (SSH)
                                  </span>
                                  <span className="text-foreground">
                                    {String(connectionInfo.port)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Port (8080)
                                  </span>
                                  <span className="text-foreground">
                                    {String(connectionInfo.port8080)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    User
                                  </span>
                                  <span className="text-foreground">
                                    {connectionInfo.user}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Password
                                  </span>
                                  <span className="text-foreground">
                                    {connectionInfo.boxName === 'Kali'
                                      ? 'highest'
                                      : '—'}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground">
                                    SSH 접속
                                  </span>
                                  <code className="text-foreground break-all bg-muted/40 px-2 py-1 rounded">
                                    ssh -p {connectionInfo.port}{' '}
                                    {connectionInfo.user}@
                                    {ATTACKBOX_DISPLAY_HOST}
                                  </code>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <p className="font-mono text-sm text-muted-foreground">
                              No running AttackBox found.
                            </p>
                            <p className="font-mono text-xs text-muted-foreground mt-1">
                              Select an environment and launch a box first.
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : detail && detailContent ? (
                    <Card className="border-border/40 bg-card/70 overflow-hidden">
                      <div className="p-5 border-b border-border/30 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-border/40 bg-muted/30">
                            <img
                              src={detail ? BOX_ICON[detail.name] : ''}
                              alt={detailLabel ?? ''}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-mono font-semibold text-foreground">
                              {detailLabel}
                            </h2>
                            <p className="font-mono text-xs text-muted-foreground mt-0.5">
                              {detail.name === 'Ubuntu'
                                ? (UBUNTU_VERSIONS.find(
                                    (v) => v.value === detailUbuntuVersion
                                  )?.label ?? detailUbuntuVersion)
                                : detailContent.specs[0]}
                            </p>
                          </div>
                        </div>
                        {isCurrentBoxRunning ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="font-mono shrink-0"
                            disabled={stopping}
                            onClick={() =>
                              handleStop(connectionInfo!.containerName)
                            }
                          >
                            <Square className="h-4 w-4 mr-2" />
                            {stopping ? '중지 중…' : 'Stop'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="font-mono shrink-0"
                            variant={isRunDisabled ? 'outline' : 'default'}
                            disabled={!!runningDetail || isRunDisabled}
                            onClick={handleRunFromDetail}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {isRunDisabled
                              ? 'Run Disabled'
                              : runningDetail
                                ? '실행 중…'
                                : 'Run'}
                          </Button>
                        )}
                      </div>
                      <div className="p-5 space-y-5">
                        {detail.name === 'Ubuntu' && (
                          <div>
                            <h3 className="font-mono text-xs font-medium text-foreground uppercase tracking-wider mb-2">
                              버전
                            </h3>
                            <Select
                              value={detailUbuntuVersion}
                              onValueChange={setDetailUbuntuVersion}
                            >
                              <SelectTrigger className="font-mono text-sm w-full max-w-[220px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UBUNTU_VERSIONS.map((v) => (
                                  <SelectItem
                                    key={v.value}
                                    value={v.value}
                                    className="font-mono"
                                  >
                                    {v.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <h3 className="font-mono text-xs font-medium text-foreground uppercase tracking-wider mb-2">
                            설명
                          </h3>
                          <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            {detailContent.description}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-mono text-xs font-medium text-foreground uppercase tracking-wider mb-2">
                            사양
                          </h3>
                          <ul className="font-mono text-xs text-muted-foreground space-y-1">
                            {detailContent.specs.map((s, i) => (
                              <li key={i}>· {s}</li>
                            ))}
                          </ul>
                        </div>
                        {/* {detailContent.notes && (
                        <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                          <p className="font-mono text-xs text-muted-foreground">
                            {detailContent.notes}
                          </p>
                        </div>
                      )} */}
                        <div>
                          <h3 className="font-mono text-xs font-medium text-foreground uppercase tracking-wider mb-2">
                            연결 정보 (실행 후 표시)
                          </h3>
                          <div className="rounded-lg border border-border/40 bg-muted/20 p-4 font-mono text-xs space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">
                                Host
                              </span>
                              <span className="text-foreground">
                                {isCurrentBoxRunning && connectionInfo
                                  ? ATTACKBOX_DISPLAY_HOST
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">
                                Port (SSH)
                              </span>
                              <span className="text-foreground">
                                {isCurrentBoxRunning && connectionInfo
                                  ? String(connectionInfo.port)
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">
                                Port (8080)
                              </span>
                              <span className="text-foreground">
                                {isCurrentBoxRunning && connectionInfo
                                  ? String(connectionInfo.port8080)
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">
                                User
                              </span>
                              <span className="text-foreground">
                                {isCurrentBoxRunning && connectionInfo
                                  ? connectionInfo.user
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">
                                Password
                              </span>
                              <span className="text-foreground">
                                {isCurrentBoxRunning && connectionInfo
                                  ? connectionInfo.boxName === 'Kali'
                                    ? 'highest'
                                    : '—'
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">
                                SSH 접속
                              </span>
                              <code className="text-muted-foreground break-all text-right">
                                {isCurrentBoxRunning && connectionInfo
                                  ? `ssh -p ${connectionInfo.port} ${connectionInfo.user}@${ATTACKBOX_DISPLAY_HOST}`
                                  : 'ssh -p port user@host'}
                              </code>
                            </div>
                          </div>
                          <p className="font-mono text-xs text-muted-foreground mt-2">
                            {isCurrentBoxRunning && connectionInfo ? (
                              <>
                                <strong className="text-foreground">
                                  Port {connectionInfo.port}은 SSH(22)
                                  전용입니다.
                                </strong>{' '}
                                브라우저 주소창이 아닌 터미널에서 위 SSH
                                명령으로 접속하세요. HTTP가 아닙니다.
                              </>
                            ) : (
                              '환경을 실행하면 접속 정보가 여기에 표시됩니다.'
                            )}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-border/40 bg-card/70 border-dashed min-h-[200px] flex items-center justify-center">
                      <p className="font-mono text-sm text-muted-foreground">
                        Select an environment to view details.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
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

AttackBoxPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AttackBoxPage;
