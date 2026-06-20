import { type ReactElement, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
import Head from 'next/head';
import useSWR from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import { defaultHeaders } from '@/lib/common';
import { Plus } from 'lucide-react';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';

interface RankingUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  points: number;
  currentRank: number;
  lastMachine?: string | null;
  firstBloodCount?: number;
}

interface RankingsResponse {
  data: {
    rankings: RankingUser[];
    userRanking: number | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PlaygroundRankingsProps {
  isUserAdmin: boolean;
}

const PlaygroundRankings: NextPageWithLayout<PlaygroundRankingsProps> = ({
  isUserAdmin,
}) => {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<RankingsResponse>(
    '/api/rankings/playground',
    fetcher
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rankings = data?.data?.rankings || [];
  const userRanking = data?.data?.userRanking;

  // 사용자 이름의 이니셜 생성
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // 랭크에 따른 배지 색상
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1)
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-400/20 text-gray-400 border-gray-400/30';
    if (rank === 3)
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    return 'bg-muted/20 text-muted-foreground border-border/30';
  };

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('en-US').format(points);
  };

  const handleAddScore = async () => {
    if (!selectedUserId || !points) {
      toast.error('사용자와 점수를 입력해주세요');
      return;
    }

    const pointsNum = parseInt(points, 10);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      toast.error('올바른 점수를 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/playground/scores', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          userId: selectedUserId,
          basePoints: pointsNum,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiResponse;
        toast.error(json.error.message);
        return;
      }

      toast.success('점수가 추가되었습니다');
      setIsDialogOpen(false);
      setSelectedUserId('');
      setPoints('');
      setDescription('');
      mutate(); // 데이터 새로고침
    } catch (error) {
      toast.error('점수 추가 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>PLAYGROUND RANKINGS - HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />

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
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard">
                          Dashboard
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/rankings">
                          Rankings
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs">
                          PLAYGROUND RANKINGS
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              {/* Main Content */}
              <div className="flex flex-1 flex-col gap-4 p-4 pt-6 md:p-8 md:pt-8">
                <div className="max-w-7xl mx-auto w-full">
                  {/* Header Section */}
                  <div className="mb-10 md:mb-12">
                    <div className="flex items-start justify-between gap-6 mb-6">
                      <div className="flex-1">
                        <h1 className="font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight text-foreground mb-4">
                          PLAYGROUND RANKINGS
                        </h1>
                        <p className="font-mono text-sm text-muted-foreground max-w-2xl leading-relaxed">
                          Playground 종료 후 ADMIN이 직접 추가한 점수를 기반으로
                          한 랭킹입니다
                        </p>
                      </div>
                      {isUserAdmin && (
                        <Dialog
                          open={isDialogOpen}
                          onOpenChange={setIsDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button className="font-mono text-xs uppercase tracking-wider shrink-0">
                              <Plus className="h-4 w-4 mr-2" />
                              점수 추가
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-mono">
                                Playground 점수 추가
                              </DialogTitle>
                              <DialogDescription className="font-mono text-xs">
                                사용자에게 Playground 점수를 추가합니다
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label
                                  htmlFor="userId"
                                  className="font-mono text-xs"
                                >
                                  사용자 선택
                                </Label>
                                <select
                                  id="userId"
                                  value={selectedUserId}
                                  onChange={(e) =>
                                    setSelectedUserId(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm"
                                >
                                  <option value="">사용자를 선택하세요</option>
                                  {rankings.map((user) => (
                                    <option key={user.id} value={user.id}>
                                      {user.name} ({user.email})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor="points"
                                  className="font-mono text-xs"
                                >
                                  점수
                                </Label>
                                <Input
                                  id="points"
                                  type="number"
                                  value={points}
                                  onChange={(e) => setPoints(e.target.value)}
                                  placeholder="점수를 입력하세요"
                                  className="font-mono"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor="description"
                                  className="font-mono text-xs"
                                >
                                  설명 (선택사항)
                                </Label>
                                <Input
                                  id="description"
                                  value={description}
                                  onChange={(e) =>
                                    setDescription(e.target.value)
                                  }
                                  placeholder="설명을 입력하세요"
                                  className="font-mono"
                                />
                              </div>
                              <Button
                                onClick={handleAddScore}
                                disabled={
                                  isSubmitting || !selectedUserId || !points
                                }
                                className="w-full font-mono text-xs uppercase tracking-wider"
                              >
                                {isSubmitting ? '추가 중...' : '점수 추가'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {/* User Ranking Card */}
                  {session?.user && userRanking && (
                    <div className="mb-8 p-6 border-2 border-accent/40 bg-accent/5 backdrop-blur-sm rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 border-2 border-accent/30">
                            <AvatarImage
                              src={session.user.image || undefined}
                              alt={session.user.name || 'User'}
                            />
                            <AvatarFallback className="bg-muted text-foreground font-mono text-lg">
                              {getInitials(session.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                              Your Playground Ranking
                            </p>
                            <p className="font-[var(--font-bebas)] text-3xl text-foreground">
                              #{userRanking}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                              Total Points
                            </p>
                            <p className="font-mono text-2xl font-bold text-foreground">
                              {formatPoints(
                                rankings.find((r) => r.id === session.user?.id)
                                  ?.points || 0
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                              First Blood
                            </p>
                            <p className="font-mono text-xl font-semibold text-accent">
                              {rankings.find((r) => r.id === session.user?.id)
                                ? (
                                    rankings.find(
                                      (r) => r.id === session.user?.id
                                    ) as any
                                  )?.firstBloodCount || 0
                                : 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rankings Card Grid */}
                  {isLoading ? (
                    <div className="text-center py-20">
                      <p className="font-mono text-sm text-muted-foreground">
                        Loading rankings...
                      </p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-20">
                      <p className="font-mono text-sm text-destructive">
                        랭킹을 불러오지 못했습니다
                      </p>
                    </div>
                  ) : rankings.length === 0 ? (
                    <div className="text-center py-20">
                      <p className="font-mono text-sm text-muted-foreground">
                        No rankings available
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {rankings.map((user, index) => {
                        const rank = index + 1;
                        const isCurrentUser = session?.user?.id === user.id;

                        return (
                          <div
                            key={user.id}
                            className={`group relative p-6 border rounded-xl backdrop-blur-sm transition-all duration-200 ${
                              isCurrentUser
                                ? 'border-accent/50 bg-accent/5 hover:border-accent/70 hover:shadow-lg hover:shadow-accent/10'
                                : 'border-border/30 bg-background/40 hover:border-border/50 hover:bg-background/60'
                            } ${rank <= 3 ? 'ring-2 ring-offset-2 ring-offset-background' : ''} ${
                              rank === 1
                                ? 'ring-yellow-500/30'
                                : rank === 2
                                  ? 'ring-gray-400/30'
                                  : rank === 3
                                    ? 'ring-orange-500/30'
                                    : ''
                            }`}
                          >
                            {/* Rank Badge */}
                            <div className="absolute top-4 right-4">
                              <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full font-[var(--font-bebas)] text-lg font-bold ${getRankBadgeColor(rank)}`}
                              >
                                {rank}
                              </div>
                            </div>

                            {/* User Info */}
                            <div className="flex flex-col items-center text-center pt-2">
                              <Avatar className="h-16 w-16 mb-4 border-2 border-border/30">
                                <AvatarImage
                                  src={user.image || undefined}
                                  alt={user.name}
                                />
                                <AvatarFallback className="bg-muted text-foreground font-mono text-base">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>

                              <h3 className="font-mono text-base font-semibold text-foreground mb-1 truncate w-full">
                                {user.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-accent font-normal">
                                    (You)
                                  </span>
                                )}
                              </h3>

                              <p className="font-mono text-xs text-muted-foreground mb-4 truncate w-full">
                                {user.email}
                              </p>

                              {/* Points and First Blood */}
                              <div className="mt-auto pt-4 border-t border-border/20 w-full">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                                      Points
                                    </p>
                                    <p className="font-mono text-2xl font-bold text-foreground">
                                      {formatPoints(user.points)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                                      First Blood
                                    </p>
                                    <p className="font-mono text-xl font-semibold text-accent">
                                      {(user as any).firstBloodCount || 0}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="mt-12 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Rankings are updated in real-time
                    </p>
                  </div>
                </div>
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
  const session = await getSession(context.req, context.res);

  let isUserAdmin = false;
  if (session?.user?.id) {
    const user = await getUserBySession(session);
    isUserAdmin = user ? isAdmin(user.role) : false;
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      isUserAdmin,
    },
  };
};

PlaygroundRankings.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default PlaygroundRankings;
