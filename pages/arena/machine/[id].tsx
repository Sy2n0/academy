import { type ReactElement, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Heart,
  Share2,
  Flag,
  Square,
  Download,
  Link as LinkIcon,
  Cloud,
  ArrowUpDown,
  Clock,
  Hash,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MachineDetail {
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
  attachmentUrl: string | null;
  solvedCount: number;
  firstBlood?: string;
  lastSolved?: string;
  createdAt: string;
  updatedAt: string;
}

interface MachineDetailResponse {
  data: {
    machine: MachineDetail;
  };
}

interface ContainerInstance {
  id: string;
  ipAddress: string;
  ports: Record<string, number>;
  status: 'running' | 'stopped';
  createdAt: string;
}

interface ContainerResponse {
  data: {
    instance?: ContainerInstance;
    message?: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MachineDetail: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<MachineDetailResponse>(
    id ? `/api/machines/${id}` : null,
    fetcher
  );
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [startingContainer, setStartingContainer] = useState(false);
  const [stoppingContainer, setStoppingContainer] = useState(false);
  const [activeTab, setActiveTab] = useState('play');
  const [selectedMode, setSelectedMode] = useState<'adventure'>('adventure');
  const [showVpnModal, setShowVpnModal] = useState(false);
  const [showHashModal, setShowHashModal] = useState(false);
  const [hashInfo, setHashInfo] = useState<{
    sha256: string;
    size: number;
  } | null>(null);
  const [loadingHash, setLoadingHash] = useState(false);

  // 컨테이너 인스턴스 조회 (사용자별)
  const { data: containerData, mutate: mutateContainer } =
    useSWR<ContainerResponse>(
      id && session ? `/api/machines/${id}/container` : null,
      fetcher
    );

  const machine = data?.data?.machine;
  const container = containerData?.data?.instance;

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || !id || typeof id !== 'string') return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/machines/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: flag.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '플래그 제출에 실패했습니다');
      }

      if (result.data.isCorrect) {
        toast.success(
          result.data.isFirstBlood
            ? `First Blood! 🩸 +${result.data.earnedPoints} points (${result.data.bloodBonus} bonus)`
            : `Correct! +${result.data.earnedPoints} points`,
          { duration: 5000 }
        );
        setFlag('');
        mutate();
      } else {
        toast.error(result.data.message || 'Incorrect flag');
      }
    } catch (error: any) {
      toast.error(error.message || '플래그 제출에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartContainer = async () => {
    if (!id || typeof id !== 'string' || !session) return;

    setStartingContainer(true);
    try {
      const response = await fetch(`/api/machines/${id}/container`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || '컨테이너 시작에 실패했습니다'
        );
      }

      toast.success('Container started successfully');
      mutateContainer();
    } catch (error: any) {
      toast.error(error.message || '컨테이너 시작에 실패했습니다');
    } finally {
      setStartingContainer(false);
    }
  };

  const handleShowHash = async () => {
    if (!id || typeof id !== 'string') return;
    setShowHashModal(true);
    if (hashInfo) return; // 이미 로드됨
    setLoadingHash(true);
    try {
      const response = await fetch(`/api/machines/${id}/hash`);
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || 'Hash 계산 실패');
      setHashInfo(result.data);
    } catch (error: any) {
      toast.error(error.message || 'Hash 계산 실패');
      setShowHashModal(false);
    } finally {
      setLoadingHash(false);
    }
  };

  const handleStopContainer = async () => {
    if (!id || typeof id !== 'string' || !container) return;

    setStoppingContainer(true);
    try {
      const response = await fetch(`/api/machines/${id}/container`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: container.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || '컨테이너 중지에 실패했습니다'
        );
      }

      toast.success('Container stopped successfully');
      mutateContainer();
    } catch (error: any) {
      toast.error(error.message || '컨테이너 중지에 실패했습니다');
    } finally {
      setStoppingContainer(false);
    }
  };

  const calculateScore = (solves: number) => {
    if (!machine) return 0;
    const R = machine.minimumScoreRatio / 100;
    const S = machine.score;
    const D = machine.difficultyFactor;
    const X = solves;
    const score = S * (R + (1 - R) * Math.exp(1 - X / D));
    return Math.floor(score);
  };

  // 난이도 계산 (임시로 category 기반)
  const getDifficulty = () => {
    if (!machine) return 'Easy';
    const category = machine.category?.toLowerCase() || '';
    if (category.includes('easy') || category.includes('beginner'))
      return 'Easy';
    if (category.includes('medium') || category.includes('intermediate'))
      return 'Medium';
    if (category.includes('hard') || category.includes('expert')) return 'Hard';
    return 'Easy';
  };

  // OS 추정 (임시)
  const getOS = () => {
    if (!machine) return 'Linux';
    // containerImage나 description에서 OS 추정 가능
    return 'Linux';
  };

  return (
    <>
      <Head>
        <title>{machine?.title || 'Machine Details'} - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-h-screen flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/30 px-6">
                <SidebarTrigger className="-ml-1" />
              </header>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-20">
                    <p className="font-mono text-sm text-muted-foreground">
                      Loading challenge details...
                    </p>
                  </div>
                ) : error || !machine ? (
                  <div className="text-center py-20">
                    <p className="font-mono text-sm text-destructive">
                      문제 상세 정보를 불러오지 못했습니다
                    </p>
                  </div>
                ) : (
                  <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-6">
                      {/* Left: Avatar, Name, Difficulty */}
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border-2 border-green-500">
                          <AvatarFallback className="bg-green-500/20 text-green-500 text-2xl font-bold">
                            {machine.title.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h1 className="text-3xl font-bold text-foreground mb-1">
                            {machine.title}
                          </h1>
                          <p className="text-sm text-muted-foreground">
                            {getDifficulty()} · {getOS()}
                          </p>
                        </div>
                      </div>

                      {/* Right: Action Icons */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <Heart className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 border-b border-border/30 mb-6">
                      {[
                        { id: 'play', label: 'Play Machine' },
                        { id: 'info', label: 'Machine Info' },
                        { id: 'walkthroughs', label: 'Walkthroughs' },
                        { id: 'reviews', label: 'Reviews' },
                        { id: 'activity', label: 'Activity' },
                        { id: 'changelog', label: 'Changelog' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                            activeTab === tab.id
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {tab.label}
                          {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Main Content */}
                    {activeTab === 'play' && (
                      <div className="space-y-6">
                        {/* Description */}
                        {machine.description && (
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-border/50 pl-4">
                            {machine.description}
                          </div>
                        )}

                        {/* Mode Selection and Resources */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-500"
                            >
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Adventure Mode
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            {machine.attachmentUrl ? (
                              <>
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`/api/machines/${id}/download`}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download File
                                  </a>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleShowHash}
                                  title="SHA256 Hash"
                                >
                                  <Hash className="h-4 w-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Machine Connection and Control */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Cloud className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                EU Machines 1
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowVpnModal(true)}
                            >
                              <ArrowUpDown className="h-4 w-4 mr-2" />
                              Switch VPN
                            </Button>
                          </div>

                          {container && container.status === 'running' ? (
                            <div className="space-y-4">
                              <div className="p-4 border border-border/30 rounded-md bg-background/40">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      IP Address:
                                    </span>
                                    <code className="text-sm font-mono font-bold text-foreground">
                                      {container.ipAddress}
                                    </code>
                                  </div>
                                  {Object.entries(container.ports).map(
                                    ([name, port]) => (
                                      <div
                                        key={name}
                                        className="flex items-center justify-between"
                                      >
                                        <span className="text-sm text-muted-foreground">
                                          Port:
                                        </span>
                                        <code className="text-sm font-mono font-bold text-foreground">
                                          {port}
                                        </code>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                              <Button
                                onClick={handleStopContainer}
                                disabled={stoppingContainer}
                                variant="destructive"
                                size="lg"
                                className="w-full h-12"
                              >
                                <Square className="h-4 w-4 mr-2" />
                                {stoppingContainer
                                  ? 'Stopping...'
                                  : 'Stop Machine'}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={handleStartContainer}
                              disabled={startingContainer}
                              size="lg"
                              className="w-full h-12 bg-green-500 hover:bg-green-600 text-white"
                            >
                              {startingContainer
                                ? 'Starting...'
                                : 'Start Machine'}
                            </Button>
                          )}

                          <p className="text-sm text-muted-foreground text-center">
                            Trouble connecting? Let us help
                          </p>
                        </div>

                        {/* Flag Submission */}
                        {session && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Submit Root Flag
                            </label>
                            <form
                              onSubmit={handleSubmitFlag}
                              className="flex gap-2"
                            >
                              <Input
                                type="text"
                                placeholder="Submit Root Flag"
                                value={flag}
                                onChange={(e) => setFlag(e.target.value)}
                                className="flex-1 h-11"
                                disabled={submitting}
                                required
                              />
                              <Button
                                type="submit"
                                disabled={submitting || !flag.trim()}
                                size="lg"
                                className="h-11 px-6"
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        )}

                        {/* Blood Section */}
                        <div className="space-y-3 pt-4 border-t border-border/30">
                          {/* User Blood */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              User Blood taken by
                            </span>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2a303c]">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-accent/20 text-accent text-xs">
                                  S
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground font-medium">
                                szymex73
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#8b0000] ml-auto">
                              <Clock className="h-4 w-4 text-white" />
                              <span className="text-sm font-mono text-white">
                                0H 3M 38S
                              </span>
                            </div>
                          </div>

                          {/* System Blood */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              System Blood taken by
                            </span>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2a303c]">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-accent/20 text-accent text-xs">
                                  S
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground font-medium">
                                szymex73
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#8b0000] ml-auto">
                              <Hash className="h-4 w-4 text-white" />
                              <span className="text-sm font-mono text-white">
                                0H 4M 44S
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Machine Info Tab */}
                    {activeTab === 'info' && (
                      <div className="space-y-4">
                        {machine.description ? (
                          <div className="prose prose-invert prose-sm max-w-none font-mono text-sm text-foreground whitespace-pre-wrap">
                            {machine.description}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No description provided.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Other Tabs Content */}
                    {activeTab !== 'play' && activeTab !== 'info' && (
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground">
                          {activeTab} content coming soon...
                        </p>
                      </div>
                    )}

                    {/* VPN Switch Modal */}
                    <Dialog open={showVpnModal} onOpenChange={setShowVpnModal}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>VPN 전환</DialogTitle>
                          <DialogDescription>
                            업데이트 진행 예정입니다.
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>

                    {/* SHA256 Hash Modal */}
                    <Dialog
                      open={showHashModal}
                      onOpenChange={setShowHashModal}
                    >
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="font-mono flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            File Hash
                          </DialogTitle>
                          <DialogDescription>
                            문제 파일의 무결성을 확인하세요.
                          </DialogDescription>
                        </DialogHeader>
                        {loadingHash ? (
                          <p className="font-mono text-sm text-muted-foreground py-4 text-center">
                            Computing hash...
                          </p>
                        ) : hashInfo ? (
                          <div className="space-y-3">
                            <div>
                              <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                                SHA256
                              </p>
                              <code className="block w-full break-all bg-muted/40 px-3 py-2 rounded text-xs font-mono text-foreground select-all">
                                {hashInfo.sha256}
                              </code>
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">
                              Size: {(hashInfo.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        ) : null}
                      </DialogContent>
                    </Dialog>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-border/30 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Released on{' '}
                        {new Date(machine.createdAt).toLocaleDateString(
                          'en-US',
                          {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Created by HUB
                        <div className="h-6 w-6 rounded bg-accent/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-accent">
                            I
                          </span>
                        </div>
                        InfoSecJack
                      </div>
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

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

MachineDetail.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default MachineDetail;
