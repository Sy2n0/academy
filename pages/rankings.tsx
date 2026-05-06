import { type ReactElement } from 'react';
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

interface RankingUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  totalPoints: number;
  currentRank: number;
  machinePoints?: number;
  trackPoints?: number;
  playgroundPoints?: number;
}

interface RankingsResponse {
  data: {
    rankings: RankingUser[];
    userRanking: number | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Rankings: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR<RankingsResponse>('/api/rankings', fetcher);

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
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-400/20 text-gray-400 border-gray-400/30';
    if (rank === 3) return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    return 'bg-muted/20 text-muted-foreground border-border/30';
  };

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('en-US').format(points);
  };

  return (
    <>
      <Head>
        <title>TOTAL RANKINGS - HUB ACADEMY</title>
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
                        <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs">TOTAL RANKINGS</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              {/* Main Content */}
              <div className="flex flex-1 flex-col gap-4 p-4 pt-6 md:p-8 md:pt-8">
                <div className="max-w-6xl mx-auto w-full">
                  {/* Header */}
                  <div className="mb-12 md:mb-16">
                    <h1 className="font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight text-foreground mb-4">
                      TOTAL RANKINGS
                    </h1>
                    <p className="font-mono text-sm text-muted-foreground max-w-2xl">
                      종합 랭킹: MACHINES, LEARN, PLAYGROUND에서 획득한 모든 점수를 합산하여 순위를 매깁니다.
                    </p>
                  </div>

              {/* User Ranking Info */}
              {session?.user && userRanking && (
                <div className="mb-8 p-4 border border-border/30 bg-background/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'User'} />
                      <AvatarFallback className="bg-muted text-foreground font-mono">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-mono text-xs text-muted-foreground mb-1">Your Ranking</p>
                      <p className="font-mono text-lg font-semibold text-foreground">
                        #{userRanking} Place
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rankings Table */}
              {isLoading ? (
                <div className="text-center py-20">
                  <p className="font-mono text-sm text-muted-foreground">Loading rankings...</p>
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <p className="font-mono text-sm text-destructive">랭킹을 불러오지 못했습니다</p>
                </div>
              ) : rankings.length === 0 ? (
                <div className="text-center py-20">
                  <p className="font-mono text-sm text-muted-foreground">No rankings available</p>
                </div>
              ) : (
                <div className="border border-border/30 bg-background/50 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="px-6 py-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            User
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            Points Breakdown
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            Rank Level
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.map((user, index) => {
                          const rank = index + 1;
                          const isCurrentUser = session?.user?.id === user.id;
                          
                          return (
                            <tr
                              key={user.id}
                              className={`border-b border-border/10 transition-colors ${
                                isCurrentUser
                                  ? 'bg-accent/5 hover:bg-accent/10'
                                  : 'hover:bg-background/80'
                              }`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded border font-mono text-xs font-semibold ${getRankBadgeColor(
                                      rank
                                    )}`}
                                  >
                                    {rank}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.image || undefined} alt={user.name} />
                                    <AvatarFallback className="bg-muted text-foreground font-mono text-xs">
                                      {getInitials(user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-mono text-sm font-medium text-foreground">
                                      {user.name}
                                      {isCurrentUser && (
                                        <span className="ml-2 text-xs text-accent">(You)</span>
                                      )}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                                      {user.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-6">
                                  <div className="text-right">
                                    <p className="font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                      Machine
                                    </p>
                                    <p className="font-mono text-sm font-medium text-foreground">
                                      {formatPoints((user as any).machinePoints || 0)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                      Track
                                    </p>
                                    <p className="font-mono text-sm font-medium text-foreground">
                                      {formatPoints((user as any).trackPoints || 0)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                      Playground
                                    </p>
                                    <p className="font-mono text-sm font-medium text-foreground">
                                      {formatPoints((user as any).playgroundPoints || 0)}
                                    </p>
                                  </div>
                                  <div className="text-right border-l border-border/30 pl-6">
                                    <p className="font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                                      Total
                                    </p>
                                    <p className="font-mono text-base font-semibold text-foreground">
                                      {formatPoints(user.totalPoints)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded border border-border/30 bg-muted/20 font-mono text-xs text-muted-foreground">
                                  Rank {user.currentRank}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

Rankings.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Rankings;
