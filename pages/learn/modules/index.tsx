import { type ReactElement, useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Book,
  X,
  BarChart3,
  Clock,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/router';
import useSWR from 'swr';

interface Module {
  id: string;
  title: string;
  image: string;
  type: 'REGULAR' | 'PREMIUM';
  category: 'GENERAL' | 'OFFENSIVE' | 'DEFENSIVE';
  difficulty: 'Fundamental' | 'Easy' | 'Medium' | 'Hard';
  duration: string;
  tier: string;
  progress?: number;
  status?: 'In Progress' | 'Completed' | 'Not Started';
  isCompleted?: boolean;
  isFavourite?: boolean;
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

const ModulesPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'favourite'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewBy, setViewBy] = useState<string>('default');
  const [currentPage, setCurrentPage] = useState(1);

  const MODULES_PER_PAGE = 8;

  // 실제 데이터 가져오기
  const { data, error, isLoading } = useSWR<{ data: Module[] }>(
    '/api/learn/modules',
    fetcher
  );

  const modules = data?.data || [];

  const filteredModules = modules.filter((module) => {
    if (activeTab === 'favourite' && !module.isFavourite) return false;
    if (selectedCategory !== 'all' && module.category !== selectedCategory)
      return false;
    if (
      selectedDifficulty !== 'all' &&
      module.difficulty !== selectedDifficulty
    )
      return false;
    if (selectedTier !== 'all' && module.tier !== selectedTier) return false;
    if (selectedType !== 'all' && module.type !== selectedType) return false;
    if (selectedState !== 'all') {
      if (selectedState === 'in-progress' && module.status !== 'In Progress')
        return false;
      if (selectedState === 'completed' && module.status !== 'Completed')
        return false;
      if (selectedState === 'not-started' && !module.status) return false;
    }
    if (selectedStatus !== 'all' && module.status !== selectedStatus)
      return false;
    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredModules.length / MODULES_PER_PAGE)
  );
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * MODULES_PER_PAGE,
    currentPage * MODULES_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    selectedCategory,
    selectedDifficulty,
    selectedTier,
    selectedType,
    selectedState,
    selectedStatus,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fundamental':
        return 'text-green-500';
      case 'Easy':
        return 'text-blue-500';
      case 'Medium':
        return 'text-yellow-500';
      case 'Hard':
        return 'text-red-500';
      default:
        return 'text-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'GENERAL':
        return <Book className="h-3 w-3" />;
      case 'OFFENSIVE':
        return <X className="h-3 w-3 text-red-500" />;
      case 'DEFENSIVE':
        return <Book className="h-3 w-3 text-blue-500" />;
      default:
        return <Book className="h-3 w-3" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'OFFENSIVE':
        return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'DEFENSIVE':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
      default:
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    }
  };

  const formatLabel = (value: string) =>
    value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const completedCount = modules.filter((module) => module.isCompleted).length;
  const inProgressCount = modules.filter(
    (module) => module.status === 'In Progress'
  ).length;
  const favouriteCount = modules.filter((module) => module.isFavourite).length;

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
                  <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                    Modules
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            <section className="relative overflow-hidden rounded-md border border-border/40 bg-card/80 p-5 md:p-7">
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Learning Hub
                    </p>
                    <h1 className="font-mono text-2xl md:text-3xl uppercase text-foreground">
                      {activeTab === 'all' ? 'Modules Deck' : 'Favourite Deck'}
                    </h1>
                    <p className="font-mono text-xs text-muted-foreground mt-2">
                      Explore structured modules, track progress, and keep your
                      momentum high.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`h-9 px-4 rounded-md border font-mono text-xs uppercase tracking-wide transition-colors ${
                        activeTab === 'all'
                          ? 'border-accent/50 bg-accent/20 text-foreground'
                          : 'border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                      }`}
                    >
                      All Modules
                    </button>
                    <button
                      onClick={() => setActiveTab('favourite')}
                      className={`h-9 px-4 rounded-md border font-mono text-xs uppercase tracking-wide transition-colors ${
                        activeTab === 'favourite'
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                          : 'border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        Favourite
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Total
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {modules.length}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Completed
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {completedCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      In Progress
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {inProgressCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/60 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Favourites
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {favouriteCount}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-border/40 bg-card/70 p-4 md:p-5 space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Filter Control
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-[150px] h-9 px-3 py-2 bg-background/70 border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent/20 transition-colors">
                    <span>
                      {selectedCategory === 'all'
                        ? 'Category'
                        : formatLabel(selectedCategory)}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setSelectedCategory('all')}
                    >
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedCategory('GENERAL')}
                    >
                      General
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedCategory('OFFENSIVE')}
                    >
                      Offensive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedCategory('DEFENSIVE')}
                    >
                      Defensive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="w-[150px] h-9 px-3 py-2 bg-background/70 border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent/20 transition-colors">
                    <span>
                      {selectedDifficulty === 'all'
                        ? 'Difficulty'
                        : selectedDifficulty}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setSelectedDifficulty('all')}
                    >
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedDifficulty('Fundamental')}
                    >
                      Fundamental
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedDifficulty('Easy')}
                    >
                      Easy
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedDifficulty('Medium')}
                    >
                      Medium
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedDifficulty('Hard')}
                    >
                      Hard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 bg-background/70 border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent/20 transition-colors">
                    <span>
                      {selectedTier === 'all' ? 'Tier' : selectedTier}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedTier('all')}>
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedTier('Tier 0')}>
                      Tier 0
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedTier('Tier I')}>
                      Tier I
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedTier('Tier II')}
                    >
                      Tier II
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 bg-background/70 border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent/20 transition-colors">
                    <span>
                      {selectedType === 'all'
                        ? 'Type'
                        : formatLabel(selectedType)}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedType('all')}>
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedType('REGULAR')}
                    >
                      Regular
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedType('PREMIUM')}
                    >
                      Premium
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 bg-background/70 border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent/20 transition-colors">
                    <span>
                      {selectedState === 'all'
                        ? 'State'
                        : formatLabel(selectedState)}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedState('all')}>
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedState('in-progress')}
                    >
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedState('completed')}
                    >
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedState('not-started')}
                    >
                      Not Started
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="w-[140px] h-9 px-3 py-2 bg-background/70 border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent/20 transition-colors">
                    <span>
                      {selectedStatus === 'all' ? 'Status' : selectedStatus}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedStatus('all')}>
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedStatus('In Progress')}
                    >
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedStatus('Completed')}
                    >
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedStatus('Not Started')}
                    >
                      Not Started
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-[170px] h-9 px-3 py-2 bg-background/70 border border-border rounded-md font-mono text-xs flex items-center justify-between hover:bg-accent/20 transition-colors">
                      <span>View: {formatLabel(viewBy)}</span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setViewBy('default')}>
                        Default
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewBy('grid')}>
                        Grid
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </section>

            {isLoading && (
              <div className="rounded-md border border-border/40 bg-card/60 py-14 text-center">
                <p className="font-mono text-sm text-muted-foreground">
                  Loading modules...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 py-14 text-center">
                <p className="font-mono text-sm text-destructive">
                  모듈 목록을 불러오지 못했습니다
                </p>
              </div>
            )}

            {!isLoading && !error && filteredModules.length === 0 && (
              <div className="rounded-md border border-border/40 bg-card/60 py-14 text-center">
                <p className="font-mono text-sm text-muted-foreground">
                  No modules found
                </p>
              </div>
            )}

            {!isLoading && !error && filteredModules.length > 0 && (
              <>
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {paginatedModules.map((module) => {
                    const progress = module.progress ?? 0;

                    return (
                      <article
                        key={module.id}
                        onClick={() =>
                          router.push(`/learn/modules/${module.id}`)
                        }
                        className="group cursor-pointer overflow-hidden rounded-md border border-border/40 bg-card/85 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]"
                      >
                        <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-cyan-500/15 via-transparent to-emerald-500/15">
                          <div className="absolute inset-0 grid-bg opacity-30" />
                          <div className="absolute left-3 top-3 flex items-center gap-2">
                            {module.isCompleted ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-green-500/35 bg-green-500/15 px-2 py-1 font-mono text-[10px] uppercase text-green-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </span>
                            ) : module.status === 'In Progress' ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-1 font-mono text-[10px] uppercase text-cyan-200">
                                In Progress
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="p-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-mono text-sm md:text-base text-foreground leading-snug line-clamp-2">
                              {module.title}
                            </h3>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-1 font-mono text-[10px] uppercase text-foreground">
                              <GraduationCap className="h-3 w-3" />
                              {formatLabel(module.type)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase ${getCategoryBadge(module.category)}`}
                            >
                              {getCategoryIcon(module.category)}
                              {formatLabel(module.category)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
                            <span
                              className={`inline-flex items-center gap-1 ${getDifficultyColor(module.difficulty)}`}
                            >
                              <BarChart3 className="h-3 w-3" />
                              {module.difficulty}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {module.duration || 'N/A'}
                            </span>
                            <span>{module.tier}</span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wide">
                              <span className="text-muted-foreground">
                                Progress
                              </span>
                              <span
                                className={
                                  module.isCompleted
                                    ? 'text-green-300'
                                    : 'text-cyan-300'
                                }
                              >
                                {module.isCompleted ? '100%' : `${progress}%`}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-background/70 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  module.isCompleted
                                    ? 'bg-green-500'
                                    : 'bg-cyan-500'
                                }`}
                                style={{
                                  width: `${module.isCompleted ? 100 : progress}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="font-mono text-xs"
                    >
                      Prev
                    </Button>
                    <span className="font-mono text-xs text-muted-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="font-mono text-xs"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
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

ModulesPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default ModulesPage;
