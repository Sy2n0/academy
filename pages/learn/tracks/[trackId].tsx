import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  GraduationCap,
  Shield,
  SquareStack,
  Target,
} from 'lucide-react';
import useSWR from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';

interface Track {
  id: string;
  title: string;
  description: string | null;
  type: string;
  difficulty: string;
  duration: string | null;
  imageUrl: string | null;
  moduleCount: number;
  isEnrolled: boolean;
  modules: Array<{
    id: string;
    moduleId: string;
    order: number;
    isCompleted: boolean;
    module: {
      id: string;
      title: string;
      description: string | null;
      category: string;
      difficulty: string;
      duration: string | null;
      tier: string;
      type: string;
      imageUrl: string | null;
      content: string | null;
    };
  }>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('불러오기에 실패했습니다');
  }
  return res.json();
};

const TrackDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { trackId } = router.query;
  const normalizedTrackId = Array.isArray(trackId) ? trackId[0] : trackId;
  const [activeTab, setActiveTab] = useState<'progress' | 'details'>(
    'progress'
  );

  const { data, error, isLoading, mutate } = useSWR<{ data: Track }>(
    normalizedTrackId ? `/api/learn/tracks/${normalizedTrackId}` : null,
    fetcher
  );

  const track = data?.data;

  const handleEnroll = async () => {
    if (!normalizedTrackId) return;

    try {
      const response = await fetch(
        `/api/learn/tracks/${normalizedTrackId}/enroll`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '수강 신청에 실패했습니다');
      }

      toast.success('Successfully enrolled in track');
      mutate();
    } catch (error: any) {
      toast.error(error.message || '수강 신청에 실패했습니다');
    }
  };

  const handleUnenroll = async () => {
    if (!normalizedTrackId) return;

    if (!confirm('Are you sure you want to unenroll from this track?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/learn/tracks/${normalizedTrackId}/enroll`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '수강 취소에 실패했습니다');
      }

      toast.success('Successfully unenrolled from track');
      mutate();
    } catch (error: any) {
      toast.error(error.message || '수강 취소에 실패했습니다');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fundamental':
        return 'text-sky-600 dark:text-sky-400';
      case 'Easy':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'Medium':
        return 'text-amber-600 dark:text-amber-400';
      case 'Hard':
        return 'text-rose-600 dark:text-rose-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getCategoryBadge = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('binary') || c.includes('pwn') || c.includes('exploit')) {
      return 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300';
    }
    if (c.includes('web')) {
      return 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    }
    if (c.includes('crypto') || c.includes('cryptograph')) {
      return 'border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300';
    }
    if (c.includes('reverse') || c.includes('re')) {
      return 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300';
    }
    if (c.includes('forensic') || c.includes('dfir')) {
      return 'border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300';
    }
    if (c.includes('network') || c.includes('misc')) {
      return 'border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
    }
    return 'border-border/60 bg-card/80 text-muted-foreground';
  };

  if (isLoading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <p className="font-mono text-sm text-muted-foreground">
              Loading track...
            </p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error || !track) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="font-mono text-sm text-destructive mb-4">
                트랙을 불러오지 못했습니다
              </p>
              <Button
                onClick={() => router.push('/learn/tracks')}
                variant="outline"
                className="font-mono text-xs"
              >
                Back to Tracks
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const completedModules = track.modules.filter((m) => m.isCompleted).length;
  const totalModules =
    track.modules.length > 0 ? track.modules.length : track.moduleCount;
  const progress =
    totalModules > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((completedModules / totalModules) * 100))
        )
      : 0;

  const nextModule =
    track.modules.find((m) => !m.isCompleted) ?? track.modules[0];

  const navigateToTrackModule = (
    trackModule: Track['modules'][number] | undefined
  ) => {
    const modulePathId = trackModule?.moduleId || trackModule?.module?.id;
    if (!normalizedTrackId || !modulePathId) {
      toast.error('모듈 경로 정보를 찾을 수 없습니다.');
      return;
    }

    router.push(`/learn/tracks/${normalizedTrackId}/modules/${modulePathId}`);
  };

  return (
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
                    href="/learn/tracks"
                    className="font-mono text-xs uppercase tracking-wider"
                  >
                    Track Paths
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                    {track.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/85 p-6 md:p-8">
              <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-muted/30 blur-3xl" />
              <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-muted/20 blur-3xl" />

              <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase ${track.type === 'OFFENSIVE' ? 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300'}`}
                    >
                      {track.type === 'OFFENSIVE' ? (
                        <Target className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      {track.type}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 font-mono text-[10px] uppercase text-muted-foreground">
                      <SquareStack className="h-3 w-3" />
                      {totalModules} steps
                    </span>
                    {track.isEnrolled && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/50 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase text-cyan-700 dark:text-cyan-300">
                        Enrolled
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Mission Track
                    </p>
                    <h1 className="font-[var(--font-bebas)] text-4xl md:text-5xl leading-none tracking-tight text-foreground mt-2">
                      {track.title}
                    </h1>
                    {track.description && (
                      <p className="font-mono text-xs text-muted-foreground mt-4 max-w-3xl leading-relaxed">
                        {track.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase text-muted-foreground">
                        Route Completion
                      </span>
                      <span className="font-mono text-xs text-emerald-400">
                        {progress}%
                      </span>
                    </div>
                    <div
                      className="h-2.5 rounded-full bg-border/30 overflow-hidden"
                      role="progressbar"
                      aria-label="Path progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <div
                        className="h-full bg-emerald-500 transition-[width] duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <aside className="rounded-xl border border-border/40 bg-background/55 p-4 space-y-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Command Panel
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-border/50 bg-card/60 p-2.5">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Done
                      </p>
                      <p className="font-mono text-lg text-foreground">
                        {completedModules}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/50 bg-card/60 p-2.5">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Left
                      </p>
                      <p className="font-mono text-lg text-foreground">
                        {Math.max(totalModules - completedModules, 0)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/50 bg-card/60 p-2.5 col-span-2">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Difficulty
                      </p>
                      <p
                        className={`font-mono text-sm mt-1 ${getDifficultyColor(track.difficulty)}`}
                      >
                        {track.difficulty}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/50 bg-card/60 p-2.5 col-span-2">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Duration
                      </p>
                      <p className="font-mono text-sm text-foreground mt-1">
                        {track.duration || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    {track.isEnrolled ? (
                      <>
                        <Button
                          className="font-mono text-xs"
                          onClick={() => navigateToTrackModule(nextModule)}
                          disabled={!nextModule}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Continue Path
                        </Button>
                        <Button
                          variant="outline"
                          className="font-mono text-xs"
                          onClick={handleUnenroll}
                        >
                          Unenroll
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="font-mono text-xs"
                        onClick={handleEnroll}
                      >
                        Enroll Path
                      </Button>
                    )}
                  </div>
                </aside>
              </div>
            </section>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'progress' | 'details')}
            >
              <TabsList className="font-mono text-xs">
                <TabsTrigger value="progress">Route Timeline</TabsTrigger>
                <TabsTrigger value="details">Track Brief</TabsTrigger>
              </TabsList>

              <TabsContent value="progress" className="mt-4 space-y-4">
                {track.modules.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-card/70 p-8 text-center">
                    <p className="font-mono text-sm text-muted-foreground">
                      No modules registered in this track.
                    </p>
                  </div>
                ) : (
                  <section className="rounded-xl border border-border/40 bg-card/80 p-4 md:p-5">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
                      Route Timeline
                    </p>
                    <div className="relative pl-6 space-y-3">
                      <div className="pointer-events-none absolute left-[11px] top-1 bottom-1 w-px bg-border/60" />

                      {track.modules.map((trackModule) => {
                        const module = trackModule.module;
                        const isCurrent =
                          !trackModule.isCompleted &&
                          nextModule?.id === trackModule.id;

                        return (
                          <div key={trackModule.id} className="relative">
                            <span
                              className={`absolute -left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border ${
                                trackModule.isCompleted
                                  ? 'border-emerald-400 bg-emerald-400'
                                  : isCurrent
                                    ? 'border-foreground/60 bg-foreground/60'
                                    : 'border-border bg-background'
                              }`}
                            />

                            <div className="rounded-lg border border-border/35 bg-background/50 p-4 flex flex-col md:flex-row md:items-center gap-3">
                              <div className="w-10 h-10 rounded-md border border-border/40 bg-card/70 flex items-center justify-center font-mono text-xs text-muted-foreground shrink-0">
                                {trackModule.order}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  {trackModule.isCompleted && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-1 font-mono text-[10px] uppercase text-emerald-200">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Completed
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 font-mono text-[10px] uppercase text-amber-700 dark:text-amber-300">
                                      In Progress
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">
                                    <GraduationCap className="h-3 w-3" />
                                    {module.type}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase ${getCategoryBadge(module.category)}`}
                                  >
                                    {module.category}
                                  </span>
                                </div>

                                <p className="font-mono text-sm text-foreground">
                                  {module.title}
                                </p>
                                <div className="flex items-center flex-wrap gap-3 mt-1 font-mono text-[11px] text-muted-foreground">
                                  <span
                                    className={`inline-flex items-center gap-1 ${getDifficultyColor(module.difficulty)}`}
                                  >
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    {module.difficulty}
                                  </span>
                                  {module.duration && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      {module.duration}
                                    </span>
                                  )}
                                  <span>{module.tier}</span>
                                </div>
                              </div>

                              <Button
                                onClick={() =>
                                  navigateToTrackModule(trackModule)
                                }
                                className="font-mono text-xs"
                                variant={
                                  trackModule.isCompleted
                                    ? 'outline'
                                    : 'default'
                                }
                              >
                                Open
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <section className="rounded-xl border border-border/40 bg-card/80 p-5 md:p-6 space-y-4">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Track Brief
                  </p>
                  <h2 className="font-mono text-lg text-foreground">
                    {track.title}
                  </h2>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                    {track.description ||
                      'No description provided for this track yet.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <div className="rounded-md border border-border/50 bg-background/60 p-3">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Type
                      </p>
                      <p className="font-mono text-sm text-foreground mt-1">
                        {track.type}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/50 bg-background/60 p-3">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Difficulty
                      </p>
                      <p
                        className={`font-mono text-sm mt-1 ${getDifficultyColor(track.difficulty)}`}
                      >
                        {track.difficulty}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/50 bg-background/60 p-3">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Duration
                      </p>
                      <p className="font-mono text-sm text-foreground mt-1">
                        {track.duration || 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/50 bg-background/60 p-3">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Modules
                      </p>
                      <p className="font-mono text-sm text-foreground mt-1">
                        {totalModules}
                      </p>
                    </div>
                  </div>
                </section>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
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

TrackDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default TrackDetailPage;
