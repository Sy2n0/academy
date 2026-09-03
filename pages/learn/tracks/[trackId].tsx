import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
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
        return 'text-[var(--warp-stone)]';
      case 'Easy':
        return 'text-[var(--warp-ash)]';
      case 'Medium':
        return 'text-foreground';
      case 'Hard':
        return 'text-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <p className="text-sm text-muted-foreground">Loading track...</p>
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
              <p className="text-sm text-destructive mb-4">
                트랙을 불러오지 못했습니다
              </p>
              <Button
                onClick={() => router.push('/learn/tracks')}
                variant="outline"
                className="text-xs"
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
    <div className="h-svh overflow-hidden bg-background">
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
          <AppTopBar
            crumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Tracks', href: '/learn/tracks' },
              { label: track.title },
            ]}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[880px] p-5 md:px-10 md:py-8">
              {/* Masthead. The hero card, its two blurred orbs and the
                  "Command Panel" aside carried five nested boxes around what is
                  really one heading, one number and one button. */}
              <header>
                <h1 className="text-3xl leading-tight tracking-tight text-foreground md:text-4xl">
                  {track.title}
                </h1>
                {track.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {track.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>{track.type}</span>
                  <span className={getDifficultyColor(track.difficulty)}>
                    {track.difficulty}
                  </span>
                  {track.duration && track.duration !== '0' && (
                    <span className="warp-num">{track.duration}</span>
                  )}
                  {track.isEnrolled && (
                    <span className="ml-auto text-foreground">Enrolled</span>
                  )}
                </div>

                {/* The one number a track has: how far through it you are. */}
                <div className="mt-6 flex items-baseline justify-between gap-4">
                  <span className="warp-num text-4xl font-medium tracking-tight text-foreground">
                    {completedModules}
                    <span className="text-muted-foreground">
                      /{totalModules}
                    </span>
                  </span>
                  <span className="warp-num text-sm text-muted-foreground">
                    {progress}%
                  </span>
                </div>
                <div
                  className="mt-3 h-px w-full bg-[var(--warp-rule)]"
                  role="progressbar"
                  aria-label="Path progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-px bg-[var(--warp-parchment)] transition-[width] duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-[var(--warp-rule)] pb-6">
                  {track.isEnrolled ? (
                    <>
                      <Button
                        className="bg-[var(--warp-parchment)] text-[var(--warp-void)] hover:bg-[var(--warp-ash)]"
                        onClick={() => navigateToTrackModule(nextModule)}
                        disabled={!nextModule}
                      >
                        {completedModules > 0 ? 'Continue' : 'Start'}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleUnenroll}
                      >
                        Unenroll
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="bg-[var(--warp-parchment)] text-[var(--warp-void)] hover:bg-[var(--warp-ash)]"
                      onClick={handleEnroll}
                    >
                      Enroll
                    </Button>
                  )}
                </div>
              </header>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'progress' | 'details')}
              >
                <TabsList className="text-[11px] uppercase tracking-[0.12em]">
                  <TabsTrigger value="progress">Curriculum</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                <TabsContent value="progress" className="mt-6">
                  {track.modules.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                      No modules registered in this track.
                    </p>
                  ) : (
                    /* The curriculum is the page. It was a bordered card
                       holding a dotted timeline holding one bordered card per
                       module, each with four badges — three levels of box for a
                       list that is really "step, name, state". */
                    <ol className="border-t border-[var(--warp-rule)]">
                      {track.modules.map((trackModule) => {
                        const module = trackModule.module;
                        const isCurrent =
                          !trackModule.isCompleted &&
                          nextModule?.id === trackModule.id;

                        return (
                          <li key={trackModule.id}>
                            <button
                              type="button"
                              onClick={() => navigateToTrackModule(trackModule)}
                              className="group flex w-full items-baseline gap-4 border-b border-[var(--warp-rule)] py-3.5 text-left transition-colors hover:bg-white/[0.03]"
                            >
                              <span
                                className={`warp-num w-6 shrink-0 text-right text-xs ${
                                  trackModule.isCompleted || isCurrent
                                    ? 'text-foreground'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {trackModule.order}
                              </span>

                              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                {module.title}
                              </span>

                              {isCurrent && (
                                <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-foreground">
                                  Next
                                </span>
                              )}

                              <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground lg:inline">
                                {module.category}
                              </span>
                              <span
                                className={`hidden w-24 shrink-0 text-right text-xs sm:inline ${getDifficultyColor(module.difficulty)}`}
                              >
                                {module.difficulty}
                              </span>
                              <span className="warp-num hidden w-14 shrink-0 text-right text-xs text-muted-foreground md:inline">
                                {module.duration || '—'}
                              </span>
                              <span className="w-4 shrink-0 text-center text-xs text-foreground">
                                {trackModule.isCompleted ? '✓' : ''}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </TabsContent>

                <TabsContent value="details" className="mt-4">
                  <section className="rounded-md border border-[var(--warp-rule)]  p-5 md:p-6 space-y-4">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Track Brief
                    </p>
                    <h2 className="text-lg text-foreground">{track.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {track.description ||
                        'No description provided for this track yet.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                      <div className="rounded-md border border-[var(--warp-rule)] bg-background/60 p-3">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Type
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          {track.type}
                        </p>
                      </div>
                      <div className="rounded-md border border-[var(--warp-rule)] bg-background/60 p-3">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Difficulty
                        </p>
                        <p
                          className={`text-sm mt-1 ${getDifficultyColor(track.difficulty)}`}
                        >
                          {track.difficulty}
                        </p>
                      </div>
                      <div className="rounded-md border border-[var(--warp-rule)] bg-background/60 p-3">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Duration
                        </p>
                        <p className="warp-num text-sm text-foreground mt-1">
                          {track.duration || 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-md border border-[var(--warp-rule)] bg-background/60 p-3">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Modules
                        </p>
                        <p className="warp-num text-sm text-foreground mt-1">
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
    </div>
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
