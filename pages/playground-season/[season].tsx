import { type ReactElement, useMemo, useState } from 'react';
import Head from 'next/head';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRef } from 'react';
import { Search, Activity, Download, Flag } from 'lucide-react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { prisma } from '@/lib/prisma';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PlaygroundSeasonPageProps {
  season: string;
  isCurrentUserAdmin: boolean;
}

interface PlaygroundChallenge {
  id: string;
  playgroundCodeName: string;
  title: string;
  category: string;
  difficulty: string;
  value: number;
  flagType: string;
  description?: string | null;
  serverAddress?: string | null;
  serverPort?: number | null;
  attachments?: unknown;
}

interface ChallengeAttachment {
  name: string;
  size: number;
  type: string;
  key: string | undefined;
  url: string | undefined;
  scope?: 'public' | 'programming_answer';
}

interface PlaygroundChallengeResponse {
  data: PlaygroundChallenge[];
}

interface PlaygroundFeedItem {
  id: string;
  message: string;
  createdAt: string;
}

interface PlaygroundFeedResponse {
  data: PlaygroundFeedItem[];
}

interface PlaygroundSolveItem {
  id: string;
  userName: string;
  createdAt: string;
}

interface PlaygroundSolveResponse {
  data: PlaygroundSolveItem[];
}

interface PlaygroundProgressResponse {
  data: {
    rank: number | null;
    points: number;
    solvedChallengeIds: string[];
  };
}

interface PlaygroundScoreboardItem {
  rank: number;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  points: number;
  solvedCount: number;
  solvedChallengeIds: string[];
  firstBloodChallengeIds: string[];
}

interface PlaygroundScoreboardResponse {
  data: PlaygroundScoreboardItem[];
}

interface PlaygroundFlagSubmissionItem {
  id: string;
  challengeId: string;
  challengeTitle: string;
  category: string;
  difficulty: string;
  userId: string;
  userName: string;
  userEmail: string;
  submittedFlag: string;
  isCorrect: boolean;
  submissionMethod: string;
  attemptNumber: number;
  createdAt: string;
}

interface PlaygroundFlagSubmissionResponse {
  data: PlaygroundFlagSubmissionItem[];
}

type CompileStage =
  | 'idle'
  | 'container'
  | 'compare'
  | 'compile'
  | 'run'
  | 'done'
  | 'error';
type CompileStepStatus = 'waiting' | 'active' | 'completed' | 'failed';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const BUCKET_BASE = 'https://bucket.hub-h4ck.com';
const normalizeSeasonKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ');

const categories = [
  'All',
  'Pwn',
  'Reversing',
  'Web',
  'Crypto',
  'Forensics',
  'Programming',
];

const PlaygroundSeasonPage: NextPageWithLayout<PlaygroundSeasonPageProps> = ({
  season,
  isCurrentUserAdmin,
}) => {
  // --- Scoreboard Capture Logic ---
  const scoreboardCaptureRef = useRef<HTMLDivElement>(null);
  async function handleCaptureScoreboard() {
    if (!scoreboardCaptureRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const target = scoreboardCaptureRef.current;
      const fallbackBackground = 'rgb(15, 23, 42)';
      const pageBackground =
        getComputedStyle(document.body).backgroundColor || fallbackBackground;
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: pageBackground,
        width: target.scrollWidth,
        height: target.scrollHeight,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeSeason = season.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `scoreboard_${safeSeason}_${timestamp}.png`;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = fileName;
      link.click();
    } catch (err) {
      // Optionally show error toast
    }
  }
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChallenge, setSelectedChallenge] =
    useState<PlaygroundChallenge | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isScoreboardModalOpen, setIsScoreboardModalOpen] = useState(false);
  const [isFlagLogModalOpen, setIsFlagLogModalOpen] = useState(false);
  const [flagLogChallengeFilter, setFlagLogChallengeFilter] = useState('all');
  const [challengeModalTab, setChallengeModalTab] = useState<
    'overview' | 'compile' | 'solves'
  >('overview');
  const [flagInput, setFlagInput] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [instanceInfoVisible, setInstanceInfoVisible] = useState(false);
  const [compileSource, setCompileSource] = useState('');
  const [compileInput, setCompileInput] = useState('');
  const [compileStdout, setCompileStdout] = useState('');
  const [compileStderr, setCompileStderr] = useState('');
  const [compileExitCode, setCompileExitCode] = useState<number | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileStage, setCompileStage] = useState<CompileStage>('idle');
  const [compilePhase, setCompilePhase] = useState<'compile' | 'run' | null>(
    null
  );
  const [compileProgressMessage, setCompileProgressMessage] = useState('');
  const [answerCompareChecked, setAnswerCompareChecked] = useState(false);
  const [answerCompareMatched, setAnswerCompareMatched] = useState(false);
  const [answerCompareMessage, setAnswerCompareMessage] = useState('');
  const [compileFlag, setCompileFlag] = useState<string | null>(null);
  const { data: challengeData } = useSWR<PlaygroundChallengeResponse>(
    `/api/playground/challenges?season=${encodeURIComponent(season)}`,
    fetcher
  );
  const { data: feedData } = useSWR<PlaygroundFeedResponse>(
    `/api/playground/feed?season=${encodeURIComponent(season)}`,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );
  const { data: solveData } = useSWR<PlaygroundSolveResponse>(
    selectedChallenge
      ? `/api/playground/challenge-solves?season=${encodeURIComponent(season)}&challengeId=${encodeURIComponent(selectedChallenge.id)}&title=${encodeURIComponent(selectedChallenge.title)}`
      : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );
  const { data: progressData, mutate: mutateProgress } =
    useSWR<PlaygroundProgressResponse>(
      `/api/playground/progress?season=${encodeURIComponent(season)}`,
      fetcher,
      {
        refreshInterval: 5000,
        revalidateOnFocus: true,
      }
    );
  const { data: scoreboardData, isLoading: scoreboardLoading } =
    useSWR<PlaygroundScoreboardResponse>(
      isScoreboardModalOpen
        ? `/api/playground/scoreboard?season=${encodeURIComponent(season)}`
        : null,
      fetcher,
      {
        refreshInterval: 10000,
        revalidateOnFocus: true,
      }
    );
  const { data: flagLogData, isLoading: flagLogLoading } =
    useSWR<PlaygroundFlagSubmissionResponse>(
      isCurrentUserAdmin && isFlagLogModalOpen
        ? `/api/admin/playground/flag-submissions?season=${encodeURIComponent(season)}&challengeId=${encodeURIComponent(flagLogChallengeFilter)}`
        : null,
      fetcher,
      {
        refreshInterval: 5000,
        revalidateOnFocus: true,
      }
    );
  const scenarios = challengeData?.data || [];
  const activities = feedData?.data || [];
  const solveUsers = solveData?.data || [];
  const rank = progressData?.data?.rank ?? null;
  const solvedChallengeIds = progressData?.data?.solvedChallengeIds || [];
  const points = progressData?.data?.points || 0;
  const scoreboardRows = scoreboardData?.data || [];
  const flagLogRows = flagLogData?.data || [];
  const formatAgo = (value: string) => {
    const diffMs = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };
  const categoryFilteredScenarios = useMemo(() => {
    if (selectedCategory === 'all') return scenarios;
    return scenarios.filter(
      (scenario) => scenario.category.toLowerCase() === selectedCategory
    );
  }, [scenarios, selectedCategory]);
  const solvedSet = useMemo(
    () => new Set(solvedChallengeIds),
    [solvedChallengeIds]
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const unsolvedScenarios = useMemo(
    () =>
      categoryFilteredScenarios
        .filter((scenario) => !solvedSet.has(scenario.id))
        .filter((scenario) =>
          normalizedSearch
            ? scenario.title.toLowerCase().includes(normalizedSearch)
            : true
        ),
    [categoryFilteredScenarios, solvedSet, normalizedSearch]
  );
  const solvedScenarios = useMemo(
    () => scenarios.filter((scenario) => solvedSet.has(scenario.id)),
    [scenarios, solvedSet]
  );
  const scoreboardChallenges = useMemo(
    () =>
      [...scenarios].sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return a.title.localeCompare(b.title);
      }),
    [scenarios]
  );
  const isProgrammingChallenge =
    selectedChallenge?.category?.toLowerCase() === 'programming';
  const isInstanceEnabled = Boolean(
    selectedChallenge?.serverAddress?.trim() && selectedChallenge?.serverPort
  );
  const defaultCSource = useMemo(() => {
    const title = selectedChallenge?.title || 'Programming Challenge';
    return `#include <stdio.h>\n\nint main(void) {\n    // ${title}\n    printf("Hello, HUB\\n");\n    return 0;\n}\n`;
  }, [selectedChallenge?.title]);
  const selectedAttachments = useMemo<ChallengeAttachment[]>(() => {
    if (!selectedChallenge || !Array.isArray(selectedChallenge.attachments))
      return [];

    return selectedChallenge.attachments.reduce<ChallengeAttachment[]>(
      (acc, item) => {
        if (!item || typeof item !== 'object') return acc;
        const target = item as Record<string, unknown>;
        if (typeof target.name !== 'string') return acc;
        if (target.scope === 'programming_answer') return acc;

        acc.push({
          name: target.name,
          size: typeof target.size === 'number' ? target.size : 0,
          type: typeof target.type === 'string' ? target.type : '',
          key: typeof target.key === 'string' ? target.key : undefined,
          url: typeof target.url === 'string' ? target.url : undefined,
          scope:
            target.scope === 'programming_answer'
              ? 'programming_answer'
              : 'public',
        });

        return acc;
      },
      []
    );
  }, [selectedChallenge]);
  const getDownloadUrl = (file: ChallengeAttachment) => {
    if (file.key) {
      return `/api/playground/attachment-download?key=${encodeURIComponent(file.key)}`;
    }

    if (file.url && file.url.startsWith(BUCKET_BASE)) {
      return `/api/playground/attachment-download?url=${encodeURIComponent(file.url)}`;
    }

    if (file.url) return file.url;
    return null;
  };

  const handleStartInstance = async () => {
    const serverAddress = selectedChallenge?.serverAddress?.trim();
    const serverPort = selectedChallenge?.serverPort;

    if (!serverAddress || !serverPort) {
      toast.error('해당 챌린지의 SERVER ADDRESS 또는 PORT 정보가 없습니다.');
      return;
    }

    setInstanceInfoVisible(true);
    toast.success(`SERVER: ${serverAddress}  PORT: ${serverPort}`);
  };

  const getCompileStepStatus = (
    step: 'container' | 'compare' | 'compile' | 'run'
  ): CompileStepStatus => {
    if (compileStage === 'idle') return 'waiting';
    if (compileStage === 'container') {
      return step === 'container' ? 'active' : 'waiting';
    }
    if (compileStage === 'compare') {
      if (step === 'container') return 'completed';
      if (step === 'compare') return 'active';
      return 'waiting';
    }
    if (compileStage === 'compile') {
      if (step === 'container' || step === 'compare') return 'completed';
      if (step === 'compile') return 'active';
      return 'waiting';
    }
    if (compileStage === 'run') {
      if (step === 'run') return 'active';
      return 'completed';
    }
    if (compileStage === 'done') return 'completed';

    if (compileStage === 'error') {
      if (compilePhase === null) {
        if (step === 'container') return 'failed';
        return 'waiting';
      }

      if (compilePhase === 'compile') {
        if (step === 'container' || step === 'compare') return 'completed';
        if (step === 'compile') return 'failed';
        return 'waiting';
      }

      if (compilePhase === 'run') {
        if (step === 'run') return 'failed';
        return 'completed';
      }

      return step === 'container' ? 'failed' : 'waiting';
    }

    return 'waiting';
  };

  const stepClassName = (status: CompileStepStatus) => {
    if (status === 'active')
      return 'border-accent/60 bg-accent/10 text-foreground';
    if (status === 'completed')
      return 'border-green-500/30 bg-green-500/10 text-foreground';
    if (status === 'failed')
      return 'border-destructive/40 bg-destructive/10 text-destructive';
    return 'border-border/30 bg-background/40 text-muted-foreground';
  };

  const handleCompileSubmit = async () => {
    if (!selectedChallenge?.id) return;

    const source = (
      compileSource.trim() ? compileSource : defaultCSource
    ).trim();
    if (!source) {
      toast.error('C source code is required.');
      return;
    }

    const stageTimers: Array<ReturnType<typeof setTimeout>> = [];

    try {
      setCompiling(true);
      setCompileStdout('');
      setCompileStderr('');
      setCompileExitCode(null);
      setCompilePhase(null);
      setAnswerCompareChecked(false);
      setAnswerCompareMatched(false);
      setAnswerCompareMessage('');
      setCompileFlag(null);
      setCompileStage('container');
      setCompileProgressMessage('Starting sandbox container...');

      stageTimers.push(
        setTimeout(() => {
          setCompileStage((prev) => (prev === 'container' ? 'compare' : prev));
          setCompileProgressMessage((prev) =>
            prev === 'Starting sandbox container...'
              ? 'Comparing with correct file...'
              : prev
          );
        }, 800)
      );

      stageTimers.push(
        setTimeout(() => {
          setCompileStage((prev) => (prev === 'compare' ? 'compile' : prev));
          setCompileProgressMessage((prev) =>
            prev === 'Comparing with correct file...'
              ? 'Compiling C source...'
              : prev
          );
        }, 1500)
      );

      stageTimers.push(
        setTimeout(() => {
          setCompileStage((prev) => (prev === 'compile' ? 'run' : prev));
          setCompileProgressMessage((prev) =>
            prev === 'Compiling C source...'
              ? 'Running executable in sandbox...'
              : prev
          );
        }, 2400)
      );

      const response = await fetch('/api/playground/compile-c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          source,
          stdin: compileInput,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Compile failed');
      }

      const phase = result?.data?.phase === 'compile' ? 'compile' : 'run';
      const comparison = result?.data?.comparison;
      const matchedFlag =
        typeof result?.data?.flag === 'string' ? result.data.flag : null;
      const stdout =
        typeof result?.data?.stdout === 'string' ? result.data.stdout : '';
      const stderr =
        typeof result?.data?.stderr === 'string' ? result.data.stderr : '';
      const exitCode =
        typeof result?.data?.exitCode === 'number'
          ? result.data.exitCode
          : null;

      const compareChecked = Boolean(comparison?.checked);
      const compareMatched = Boolean(comparison?.matched);
      const compareMessage =
        typeof comparison?.message === 'string'
          ? comparison.message
          : compareChecked
            ? compareMatched
              ? 'Source matches the correct file.'
              : 'Source does not match the correct file.'
            : 'No answer file comparison available.';

      setAnswerCompareChecked(compareChecked);
      setAnswerCompareMatched(compareMatched);
      setAnswerCompareMessage(compareMessage);
      setCompileFlag(matchedFlag);

      setCompilePhase(phase);
      setCompileStdout(stdout);
      setCompileStderr(stderr);
      setCompileExitCode(exitCode);

      const finalSuccess = Boolean(result?.data?.success);

      if (finalSuccess) {
        setCompileStage('done');
        setCompileProgressMessage(
          'Answer match and sandbox compile/run completed successfully.'
        );
        toast.success('Correct');
      } else {
        setCompileStage('error');
        if (!compareChecked) {
          setCompileProgressMessage(
            'Answer comparison could not be performed.'
          );
        } else if (!compareMatched) {
          setCompileProgressMessage(
            'Answer file comparison failed (source mismatch).'
          );
        } else {
          setCompileProgressMessage(
            phase === 'compile'
              ? 'Compilation failed. Check stderr.'
              : 'Execution finished with errors. Check stderr.'
          );
        }
        toast.error('Incorrect');
      }
    } catch (error: any) {
      const errorMessage =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Compile failed';
      toast.error(errorMessage);
      setCompileStage('error');
      setCompilePhase(null);
      setCompileProgressMessage(errorMessage);
      setCompileStderr(errorMessage);
    } finally {
      stageTimers.forEach((timer) => clearTimeout(timer));
      setCompiling(false);
    }
  };

  const handleSourceTabKey = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key !== 'Tab') return;

    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;
    const insert = '    ';

    const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`;
    setCompileSource(nextValue);

    requestAnimationFrame(() => {
      target.selectionStart = start + insert.length;
      target.selectionEnd = start + insert.length;
    });
  };

  return (
    <>
      <Head>
        <title>{season.toUpperCase()} Playground</title>
      </Head>

      <div className="relative h-screen bg-background overflow-hidden">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10 h-full">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="h-full flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Playground
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <main className="flex-1 flex items-center justify-center">
                <section className="w-full h-full overflow-y-auto px-4 md:px-8 py-5">
                  <div className="max-w-[1360px] mx-auto space-y-4">
                    <div className="rounded-lg border border-border bg-card/70 p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            Season Playground
                          </p>
                          <h2 className="font-mono text-2xl md:text-3xl text-foreground uppercase mt-1">
                            {season}
                          </h2>
                          <p className="font-mono text-xs text-muted-foreground mt-1">
                            Stay Curious and Keep Hacking!
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setIsScoreboardModalOpen(true)}
                            className="h-9 px-4 rounded border border-accent/50 bg-accent/10 font-mono text-xs uppercase text-foreground"
                          >
                            View Scoreboard
                          </button>
                          {isCurrentUserAdmin && (
                            <button
                              type="button"
                              onClick={() => setIsFlagLogModalOpen(true)}
                              className="h-9 px-4 rounded border border-accent/50 bg-accent/10 font-mono text-xs uppercase text-foreground"
                            >
                              Flag 제출 로그
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded border border-border bg-card/70 px-4 py-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          Rank
                        </p>
                        <p className="font-mono text-xl text-foreground">
                          {rank ? `#${rank}` : '-'}
                        </p>
                      </div>
                      <div className="rounded border border-border bg-card/70 px-4 py-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          Points
                        </p>
                        <p className="font-mono text-xl text-foreground">
                          {points}
                        </p>
                      </div>
                      <div className="rounded border border-border bg-card/70 px-4 py-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          Challenges
                        </p>
                        <p className="font-mono text-xl text-foreground">
                          {solvedScenarios.length}/{scenarios.length}
                        </p>
                      </div>
                      <div className="rounded border border-border bg-card/70 px-4 py-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          Flags
                        </p>
                        <p className="font-mono text-xl text-foreground">
                          {solvedScenarios.length}/{scenarios.length}
                        </p>
                      </div>
                    </div>

                    <div className="rounded border border-border bg-card/70 p-3 md:p-4 space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search challenges"
                          className="w-full bg-background/60 border border-border rounded text-xs font-mono text-foreground placeholder:text-muted-foreground pl-10 pr-3 py-2"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => {
                          const value = category.toLowerCase();
                          const isSelected = selectedCategory === value;

                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setSelectedCategory(value)}
                              className={`px-3 py-1.5 rounded border font-mono text-[10px] uppercase ${
                                isSelected
                                  ? 'border-accent bg-accent/10 text-foreground'
                                  : 'border-border bg-background/70 text-muted-foreground'
                              }`}
                            >
                              {category}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
                      <div className="space-y-4">
                        <div className="bg-card/70 border border-border rounded overflow-hidden">
                          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <span className="font-mono text-[11px] uppercase text-foreground">
                              Challenge Board
                            </span>
                            <span className="font-mono text-[10px] uppercase text-muted-foreground">
                              Unsolved · {unsolvedScenarios.length}
                            </span>
                          </div>
                          <table className="w-full table-fixed text-xs font-mono">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border">
                                <th className="w-[40%] text-left px-4 py-2">
                                  Challenge
                                </th>
                                <th className="w-[15%] text-left px-4 py-2">
                                  Points
                                </th>
                                <th className="w-[20%] text-left px-4 py-2">
                                  Difficulty
                                </th>
                                <th className="w-[25%] text-left px-4 py-2">
                                  Category
                                </th>
                              </tr>
                            </thead>
                          </table>
                          <div className="max-h-[235px] overflow-y-auto">
                            <table className="w-full table-fixed text-xs font-mono">
                              <tbody>
                                {unsolvedScenarios.length > 0 ? (
                                  unsolvedScenarios.map((scenario) => (
                                    <tr
                                      key={scenario.id}
                                      className="border-b last:border-b-0 border-border/70"
                                    >
                                      <td className="w-[40%] px-4 py-2 text-foreground">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedChallenge(scenario);
                                            setFlagInput('');
                                            setCompileSource('');
                                            setCompileInput('');
                                            setCompileStdout('');
                                            setCompileStderr('');
                                            setCompileExitCode(null);
                                            setCompileStage('idle');
                                            setCompilePhase(null);
                                            setCompileProgressMessage('');
                                            setAnswerCompareChecked(false);
                                            setAnswerCompareMatched(false);
                                            setAnswerCompareMessage('');
                                            setCompileFlag(null);
                                            setInstanceInfoVisible(false);
                                            setChallengeModalTab('overview');
                                            setIsChallengeModalOpen(true);
                                          }}
                                          className="text-left hover:underline underline-offset-2 truncate block"
                                        >
                                          {scenario.title}
                                        </button>
                                      </td>
                                      <td className="w-[15%] px-4 py-2 text-foreground">
                                        {scenario.value}
                                      </td>
                                      <td className="w-[20%] px-4 py-2 text-muted-foreground">
                                        {scenario.difficulty}
                                      </td>
                                      <td className="w-[25%] px-4 py-2 text-muted-foreground uppercase">
                                        {scenario.category}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                      <span className="font-mono text-xs">
                                        No scenarios found for this category.
                                      </span>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="bg-card/70 border border-border rounded overflow-hidden">
                          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <span className="font-mono text-[11px] uppercase text-foreground">
                              Solved Archive
                            </span>
                            <span className="font-mono text-[10px] uppercase text-muted-foreground">
                              {solvedScenarios.length} Solved
                            </span>
                          </div>
                          {solvedScenarios.length > 0 ? (
                            <div className="max-h-[132px] overflow-y-auto">
                              {solvedScenarios.map((scenario) => (
                                <button
                                  key={scenario.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedChallenge(scenario);
                                    setFlagInput('');
                                    setCompileSource('');
                                    setCompileInput('');
                                    setCompileStdout('');
                                    setCompileStderr('');
                                    setCompileExitCode(null);
                                    setCompileStage('idle');
                                    setCompilePhase(null);
                                    setCompileProgressMessage('');
                                    setAnswerCompareChecked(false);
                                    setAnswerCompareMatched(false);
                                    setAnswerCompareMessage('');
                                    setCompileFlag(null);
                                    setInstanceInfoVisible(false);
                                    setChallengeModalTab('overview');
                                    setIsChallengeModalOpen(true);
                                  }}
                                  className="w-full text-left px-4 py-3 border-b border-border/70 last:border-b-0 hover:bg-accent/10 rounded transition"
                                >
                                  <p className="font-mono text-xs text-foreground">
                                    {scenario.title}
                                  </p>
                                  <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase">
                                    {scenario.category} · {scenario.difficulty}{' '}
                                    · {scenario.value} pts
                                  </p>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                              <Activity className="w-5 h-5 mb-2" />
                              <p className="font-mono text-xs">
                                No solved challenges yet.
                              </p>
                              <p className="font-mono text-xs">
                                Capture your first flag.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <aside className="bg-card/70 border border-border rounded overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                          <span className="font-mono text-[11px] uppercase text-foreground">
                            Live Feed
                          </span>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                          {activities.length > 0 ? (
                            activities.slice(0, 7).map((activity) => (
                              <div
                                key={activity.id}
                                className="px-4 py-3 border-b border-border/70"
                              >
                                <p className="font-mono text-xs text-foreground leading-5">
                                  {activity.message}
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                                  {formatAgo(activity.createdAt)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-6">
                              <p className="font-mono text-xs text-muted-foreground">
                                No solve activity yet.
                              </p>
                            </div>
                          )}
                        </div>
                      </aside>
                    </div>
                  </div>
                </section>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      <Dialog
        open={isChallengeModalOpen}
        onOpenChange={setIsChallengeModalOpen}
      >
        <DialogContent className="w-[94vw] max-w-5xl border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              챌린지 이름
            </DialogTitle>
            <p className="font-mono text-xl text-foreground">
              {selectedChallenge?.title || '-'}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center border-b border-border/40">
              <button
                type="button"
                onClick={() => setChallengeModalTab('overview')}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border-b transition-colors ${
                  challengeModalTab === 'overview'
                    ? 'text-foreground border-foreground'
                    : 'text-muted-foreground border-transparent'
                }`}
              >
                개요
              </button>
              {/*
              {isProgrammingChallenge && (
                <button
                  type="button"
                  onClick={() => setChallengeModalTab('compile')}
                  className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border-b transition-colors ${
                    challengeModalTab === 'compile'
                      ? 'text-foreground border-foreground'
                      : 'text-muted-foreground border-transparent'
                  }`}
                >
                  컴파일
                </button>
              )}
              */}
              <button
                type="button"
                onClick={() => setChallengeModalTab('solves')}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border-b transition-colors ${
                  challengeModalTab === 'solves'
                    ? 'text-foreground border-foreground'
                    : 'text-muted-foreground border-transparent'
                }`}
              >
                풀이자
              </button>
            </div>

            {challengeModalTab === 'overview' ? (
              <>
                <div className="space-y-1.5">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    챌린지 설명
                  </p>
                  {selectedChallenge?.description?.trim() ? (
                    <div className="rounded border border-border/40 bg-background/40 px-3 py-2">
                      <div className="prose prose-sm max-w-none text-foreground prose-headings:font-mono prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-a:text-white hover:prose-a:text-white/90">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedChallenge.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <p className="font-mono text-sm text-foreground leading-6">
                      설명이 없습니다.
                    </p>
                  )}
                </div>

                {isInstanceEnabled && (
                  <div className="rounded border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Instance 실행
                      </p>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center justify-between rounded border border-border/40 bg-background/70 px-3 py-3">
                        <div className="space-y-2">
                          <p className="font-mono text-sm text-foreground">
                            Challenge Instance
                          </p>
                          {instanceInfoVisible ? (
                            <div className="flex items-stretch gap-2">
                              <div className="min-w-0 flex-1 rounded border border-accent/40 bg-accent/10 px-2 py-1">
                                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Server Address
                                </p>
                                <p className="font-mono text-sm text-foreground break-all">
                                  {selectedChallenge?.serverAddress}
                                </p>
                              </div>
                              <div className="w-28 rounded border border-accent/40 bg-accent/10 px-2 py-1">
                                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Port
                                </p>
                                <p className="font-mono text-sm text-foreground">
                                  {selectedChallenge?.serverPort}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="font-mono text-xs text-muted-foreground">
                              버튼을 눌러 SERVER ADDRESS / PORT 정보를
                              확인하세요.
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleStartInstance}
                          className="inline-flex h-9 items-center rounded border border-accent/60 bg-accent/20 px-3 font-mono text-xs uppercase text-foreground hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Instance 정보
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      첨부 파일 (다운로드)
                    </p>
                  </div>

                  {selectedAttachments.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedAttachments.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.type}`}
                          className="flex items-center justify-between rounded border border-border/40 px-3 py-2"
                        >
                          <div>
                            <p className="font-mono text-xs text-foreground">
                              {file.name}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                              {file.type ? ` · ${file.type}` : ''}
                            </p>
                          </div>
                          {getDownloadUrl(file) ? (
                            <a
                              href={getDownloadUrl(file) || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded border border-border/40 hover:bg-background/70"
                              aria-label={`Download ${file.name}`}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="inline-flex h-8 items-center rounded border border-border/40 px-2 font-mono text-[10px] text-muted-foreground">
                              N/A
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex items-center justify-between rounded border border-border/40 px-3 py-2">
                        <div>
                          <p className="font-mono text-xs text-foreground">
                            첨부 파일이 없습니다.
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            0.0 KB
                          </p>
                        </div>
                        <span className="inline-flex h-8 items-center rounded border border-border/40 px-2 font-mono text-[10px] text-muted-foreground">
                          N/A
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded border border-border bg-background/50 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      포인트
                    </p>
                    <p className="font-mono text-xl text-foreground">
                      {selectedChallenge?.value ?? 0}
                    </p>
                  </div>
                  <div className="rounded border border-border bg-background/50 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      난이도
                    </p>
                    <p className="font-mono text-xl text-foreground uppercase">
                      {selectedChallenge?.difficulty || '-'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    플래그
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      value={flagInput}
                      onChange={(e) => setFlagInput(e.target.value)}
                      placeholder="플래그 제출"
                      className="w-full bg-background/60 border border-border rounded text-sm font-mono text-foreground px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedChallenge?.id) return;
                        const flag = flagInput.trim();
                        if (!flag) {
                          toast.error('플래그를 입력해주세요.');
                          return;
                        }

                        try {
                          setSubmittingFlag(true);

                          const response = await fetch(
                            '/api/playground/submit-flag',
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                challengeId: selectedChallenge.id,
                                flag,
                              }),
                            }
                          );

                          const result = await response
                            .json()
                            .catch(() => ({}));
                          if (!response.ok) {
                            throw new Error(
                              result?.error?.message ||
                                '플래그 제출에 실패했습니다.'
                            );
                          }

                          if (result?.data?.correct) {
                            const message = result?.data?.alreadySolved
                              ? '이미 해결한 문제입니다.'
                              : '정답입니다!';
                            toast.success(message);
                            await mutateProgress();
                          } else {
                            toast.error('오답입니다.');
                          }
                        } catch (error: any) {
                          toast.error(
                            error?.message || '플래그 제출에 실패했습니다.'
                          );
                        } finally {
                          setSubmittingFlag(false);
                        }
                      }}
                      disabled={submittingFlag}
                      className="h-9 px-6 rounded border border-accent/50 bg-accent/10 font-mono text-xs uppercase whitespace-nowrap text-foreground hover:bg-accent/20 disabled:opacity-50"
                    >
                      {submittingFlag ? '제출 중...' : '제출'}
                    </button>
                  </div>
                </div>
              </>
            ) : challengeModalTab === 'compile' && isProgrammingChallenge ? (
              <div className="rounded border border-border bg-background/50 p-3">
                {/*
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Compile (C only)</p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedChallenge?.id) return;

                      const source = (compileSource.trim() ? compileSource : defaultCSource).trim();
                      if (!source) {
                        toast.error('C source code is required.');
                        return;
                      }

                      const stageTimers: Array<ReturnType<typeof setTimeout>> = [];

                      try {
                        setCompiling(true);
                        setCompileStdout('');
                        setCompileStderr('');
                        setCompileExitCode(null);
                        setCompilePhase(null);
                        setAnswerCompareChecked(false);
                        setAnswerCompareMatched(false);
                        setAnswerCompareMessage('');
                        setCompileFlag(null);
                        setCompileStage('container');
                        setCompileProgressMessage('Starting sandbox container...');

                        stageTimers.push(
                          setTimeout(() => {
                            setCompileStage((prev) => (prev === 'container' ? 'compare' : prev));
                            setCompileProgressMessage((prev) =>
                              prev === 'Starting sandbox container...' ? 'Comparing with correct file...' : prev
                            );
                          }, 800)
                        );

                        stageTimers.push(
                          setTimeout(() => {
                            setCompileStage((prev) => (prev === 'compare' ? 'compile' : prev));
                            setCompileProgressMessage((prev) =>
                              prev === 'Comparing with correct file...' ? 'Compiling C source...' : prev
                            );
                          }, 1500)
                        );

                        stageTimers.push(
                          setTimeout(() => {
                            setCompileStage((prev) => (prev === 'compile' ? 'run' : prev));
                            setCompileProgressMessage((prev) =>
                              prev === 'Compiling C source...' ? 'Running executable in sandbox...' : prev
                            );
                          }, 2400)
                        );

                        const response = await fetch('/api/playground/compile-c', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            challengeId: selectedChallenge.id,
                            source,
                            stdin: compileInput,
                          }),
                        });

                        const result = await response.json().catch(() => ({}));
                        if (!response.ok) {
                          throw new Error(result?.error?.message || 'Compile failed');
                        }

                        const phase = result?.data?.phase === 'compile' ? 'compile' : 'run';
                        const comparison = result?.data?.comparison;
                        const matchedFlag = typeof result?.data?.flag === 'string' ? result.data.flag : null;
                        const stdout = typeof result?.data?.stdout === 'string' ? result.data.stdout : '';
                        const stderr = typeof result?.data?.stderr === 'string' ? result.data.stderr : '';
                        const exitCode = typeof result?.data?.exitCode === 'number' ? result.data.exitCode : null;

                        const compareChecked = Boolean(comparison?.checked);
                        const compareMatched = Boolean(comparison?.matched);
                        const compareMessage =
                          typeof comparison?.message === 'string'
                            ? comparison.message
                            : compareChecked
                              ? compareMatched
                                ? 'Source matches the correct file.'
                                : 'Source does not match the correct file.'
                              : 'No answer file comparison available.';

                        setAnswerCompareChecked(compareChecked);
                        setAnswerCompareMatched(compareMatched);
                        setAnswerCompareMessage(compareMessage);
                        setCompileFlag(matchedFlag);

                        setCompilePhase(phase);
                        setCompileStdout(stdout);
                        setCompileStderr(stderr);
                        setCompileExitCode(exitCode);

                        const runtimeSuccess = Boolean(result?.data?.success);
                        const finalSuccess = runtimeSuccess && compareChecked && compareMatched;

                        if (finalSuccess) {
                          setCompileStage('done');
                          setCompileProgressMessage('Answer match and sandbox compile/run completed successfully.');
                          toast.success('Comparison + Compile/Run completed');
                        } else {
                          setCompileStage('error');
                          if (!compareChecked) {
                            setCompileProgressMessage('Answer comparison could not be performed.');
                            toast.error('Answer file comparison unavailable');
                          } else if (!compareMatched) {
                            setCompileProgressMessage('Answer file comparison failed (source mismatch).');
                            toast.error('Source does not match correct file');
                          } else {
                            setCompileProgressMessage(
                              phase === 'compile'
                                ? 'Compilation failed. Check stderr.'
                                : 'Execution finished with errors. Check stderr.'
                            );
                            toast.error('Compile/Run finished with errors');
                          }
                        }
                      } catch (error: any) {
                        toast.error(error?.message || 'Compile failed');
                        setCompileStage('error');
                        setCompilePhase(null);
                        setCompileProgressMessage(error?.message || 'Failed to start sandbox compile.');
                        setCompileStderr(error?.message || 'Compile failed');
                      } finally {
                        stageTimers.forEach((timer) => clearTimeout(timer));
                        setCompiling(false);
                      }
                    }}
                    disabled={compiling}
                    className="h-8 px-3 rounded border border-accent/50 bg-accent/10 font-mono text-[10px] uppercase text-foreground hover:bg-accent/20 disabled:opacity-50"
                  >
                    {compiling ? 'Running...' : 'Compile & Run'}
                  </button>
                </div>

                <div className="mb-3 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Progress</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {([
                      { key: 'container', label: 'Container Start' },
                      { key: 'compare', label: 'Answer Compare' },
                      { key: 'compile', label: 'Compile C' },
                      { key: 'run', label: 'Run Program' },
                    ] as const).map((step) => {
                      const status = getCompileStepStatus(step.key);
                      return (
                        <div
                          key={step.key}
                          className={`rounded border px-3 py-2 ${stepClassName(status)}`}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-wider">{step.label}</p>
                          <p className="font-mono text-[10px] mt-1 uppercase">
                            {status === 'waiting'
                              ? 'Waiting'
                              : status === 'active'
                                ? 'In Progress'
                                : status === 'completed'
                                  ? 'Completed'
                                  : 'Failed'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {compileProgressMessage || 'Run compile to see live progress.'}
                  </p>
                </div>

                <div className="mb-3 rounded border border-border/30 bg-background/40 px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Answer File Compare (Stage 1)</p>
                  <p
                    className={`font-mono text-xs mt-1 ${
                      !answerCompareChecked
                        ? 'text-muted-foreground'
                        : answerCompareMatched
                          ? 'text-foreground'
                          : 'text-destructive'
                    }`}
                  >
                    {!answerCompareChecked
                      ? 'Not checked yet'
                      : answerCompareMatched
                        ? 'Matched'
                        : 'Mismatch'}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1">
                    {answerCompareMessage || 'Run compile to compare submitted source with the challenge correct file.'}
                  </p>
                  {compileFlag && (
                    <div className="mt-2 rounded border border-green-500/40 bg-green-500/10 px-3 py-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-foreground">Flag</p>
                      <p className="font-mono text-xs text-foreground mt-1 break-all">{compileFlag}</p>
                    </div>
                  )}
                </div>
                */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        C Source
                      </p>
                      <button
                        type="button"
                        onClick={handleCompileSubmit}
                        disabled={compiling}
                        className="h-8 px-6 rounded border border-accent/50 bg-accent/10 font-mono text-[10px] uppercase whitespace-nowrap text-foreground hover:bg-accent/20 disabled:opacity-50"
                      >
                        {compiling ? '제출 중...' : '제출'}
                      </button>
                    </div>
                    <textarea
                      value={compileSource}
                      onChange={(e) => setCompileSource(e.target.value)}
                      onKeyDown={handleSourceTabKey}
                      placeholder={defaultCSource}
                      rows={20}
                      className="w-full min-h-[420px] px-3 py-2 border border-green-500/50 rounded bg-background/60 font-mono text-xs text-foreground placeholder:text-muted-foreground resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500/30"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        플래그
                      </p>
                      <div
                        className={`w-full min-h-[84px] px-3 py-2 border rounded font-mono text-xs text-foreground break-all ${
                          compileFlag
                            ? 'border-green-500/40 bg-green-500/10'
                            : 'border-border/30 bg-background/60'
                        }`}
                      >
                        {compileFlag ||
                          'Challenge를 해결하면 플래그가 표시됩니다.'}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        표준 출력
                      </p>
                      <pre className="w-full min-h-[120px] px-3 py-2 border border-border/30 rounded bg-background/60 font-mono text-xs text-foreground overflow-auto whitespace-pre-wrap break-words">
                        {compileStdout || '(출력 없음)'}
                      </pre>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        에러 출력 / 컴파일 오류
                      </p>
                      <pre className="w-full min-h-[120px] px-3 py-2 border border-border/30 rounded bg-background/60 font-mono text-xs text-foreground overflow-auto whitespace-pre-wrap break-words">
                        {compileStderr || '(에러 없음)'}
                      </pre>
                    </div>

                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                      종료 코드:{' '}
                      {compileExitCode === null ? '-' : compileExitCode}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded border border-border bg-background/50 p-3">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  풀이한 참가자
                </p>
                {solveUsers.length > 0 ? (
                  <div className="space-y-2">
                    {solveUsers.map((solve) => (
                      <div
                        key={solve.id}
                        className="flex items-center justify-between rounded border border-border/40 px-3 py-2"
                      >
                        <p className="font-mono text-sm text-foreground">
                          {solve.userName}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {formatAgo(solve.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">
                    아직 이 문제를 푼 사람이 없습니다.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Scoreboard Modal with Capture Button */}
      <Dialog
        open={isScoreboardModalOpen}
        onOpenChange={setIsScoreboardModalOpen}
      >
        <DialogContent className="w-[98vw] max-w-[1500px] max-h-[94vh] overflow-hidden overscroll-none border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <div className="flex items-center">
              <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground mt-2">
                Scoreboard
              </DialogTitle>
            </div>
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={handleCaptureScoreboard}
                className="h-8 px-3 rounded border border-accent/50 bg-accent/10 font-mono text-[10px] uppercase text-foreground hover:bg-accent/20"
              >
                Capture
              </button>
            </div>
          </DialogHeader>

          {scoreboardLoading ? (
            <div className="py-8 text-center border border-dashed border-border/40 rounded">
              <p className="font-mono text-xs text-muted-foreground">
                Loading scoreboard...
              </p>
            </div>
          ) : scoreboardRows.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border/40 rounded">
              <p className="font-mono text-xs text-muted-foreground">
                No scoreboard data yet.
              </p>
            </div>
          ) : (
            <div className="overflow-auto overscroll-none max-h-[78vh] rounded border border-border/20 no-scrollbar">
              <div ref={scoreboardCaptureRef} id="scoreboard-capture-root">
                <table className="w-full min-w-[680px] table-fixed text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/20 bg-card text-muted-foreground">
                      <th className="sticky left-0 top-0 z-[110] w-14 bg-card px-3 py-3 text-left">
                        #
                      </th>
                      <th className="sticky left-14 top-0 z-[110] w-[84px] bg-card px-0.5 py-3 text-left whitespace-nowrap">
                        Team
                      </th>
                      <th className="sticky left-[140px] top-0 z-[120] relative w-14 bg-card px-0 py-3 border-r border-border/40">
                        <span className="absolute inset-0 flex items-center justify-center">
                          Score
                        </span>
                      </th>
                      {scoreboardChallenges.map((challenge) => (
                        <th
                          key={`scoreboard-head-${challenge.id}`}
                          className="relative z-0 w-[64px] min-w-[64px] h-32 px-0 py-2 text-left align-bottom"
                          title={challenge.title}
                        >
                          <div className="relative h-28 w-full overflow-visible">
                            <span className="absolute bottom-2 left-1/2 inline-block -rotate-[50deg] origin-bottom-left whitespace-nowrap text-[9px] leading-none text-muted-foreground/90">
                              {challenge.title}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scoreboardRows.map((row, index) => {
                      const solved = new Set(row.solvedChallengeIds || []);
                      const firstBlood = new Set(
                        row.firstBloodChallengeIds || []
                      );
                      const rowBg = index % 2 === 0 ? 'bg-card' : 'bg-muted/10';

                      return (
                        <tr
                          key={row.userId}
                          className={`border-b border-border/10 last:border-b-0 ${rowBg}`}
                        >
                          <td className="sticky left-0 z-[110] bg-card px-3 py-3 text-muted-foreground">
                            {row.rank}
                          </td>
                          <td className="sticky left-14 z-[110] w-[84px] bg-card px-0.5 py-3 text-foreground font-semibold whitespace-nowrap">
                            {row.name}
                          </td>
                          <td className="sticky left-[140px] z-[120] w-14 bg-card px-0.5 py-3 text-foreground font-semibold border-r border-border/40">
                            <span className="block w-full text-center tabular-nums">
                              {row.points}
                            </span>
                          </td>
                          {scoreboardChallenges.map((challenge) => {
                            const isSolved = solved.has(challenge.id);
                            const isFirstBlood = firstBlood.has(challenge.id);

                            return (
                              <td
                                key={`scoreboard-cell-${row.userId}-${challenge.id}`}
                                className="relative z-0 w-[64px] min-w-[64px] px-0 py-3 text-center"
                              >
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center ${
                                    isFirstBlood
                                      ? 'text-red-500'
                                      : isSolved
                                        ? 'text-green-500'
                                        : 'text-muted-foreground/45'
                                  }`}
                                  title={
                                    isFirstBlood
                                      ? 'First Blood'
                                      : isSolved
                                        ? 'Solved'
                                        : 'Unsolved'
                                  }
                                >
                                  <Flag
                                    className={`h-3.5 w-3.5 ${isSolved || isFirstBlood ? 'fill-current' : ''}`}
                                  />
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFlagLogModalOpen}
        onOpenChange={(open) => {
          setIsFlagLogModalOpen(open);
          if (!open) {
            setFlagLogChallengeFilter('all');
          }
        }}
      >
        <DialogContent className="w-[96vw] max-w-6xl border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              Flag 제출 로그
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                문제 필터
              </p>
              <select
                value={flagLogChallengeFilter}
                onChange={(event) =>
                  setFlagLogChallengeFilter(event.target.value)
                }
                className="h-8 rounded border border-border/30 bg-background/60 px-2 font-mono text-xs text-foreground"
              >
                <option value="all">전체</option>
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
            </div>

            {flagLogLoading ? (
              <div className="py-8 text-center border border-dashed border-border/40 rounded">
                <p className="font-mono text-xs text-muted-foreground">
                  로그를 불러오는 중...
                </p>
              </div>
            ) : flagLogRows.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border/40 rounded">
                <p className="font-mono text-xs text-muted-foreground">
                  제출 로그가 없습니다.
                </p>
              </div>
            ) : (
              <div className="border border-border/20 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1060px] text-xs font-mono">
                    <thead>
                      <tr className="border-b border-border/20 bg-background/70 text-muted-foreground">
                        <th className="px-3 py-2 text-left">시간</th>
                        <th className="px-3 py-2 text-left">사용자</th>
                        <th className="px-3 py-2 text-left">문제</th>
                        <th className="px-3 py-2 text-left">제출 플래그</th>
                        <th className="px-3 py-2 text-left">제출 방식</th>
                        <th className="px-3 py-2 text-right">시도</th>
                        <th className="px-3 py-2 text-right">결과</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1060px] text-xs font-mono">
                      <tbody>
                        {flagLogRows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-border/10 last:border-b-0"
                          >
                            <td className="px-3 py-2 text-foreground whitespace-nowrap">
                              {new Date(row.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false,
                              })}
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              <p>{row.userName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {row.userEmail}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              <p>{row.challengeTitle}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">
                                {row.category || '-'} · {row.difficulty || '-'}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-foreground break-all">
                              {row.submittedFlag}
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {row.submissionMethod}
                            </td>
                            <td className="px-3 py-2 text-right text-foreground">
                              {row.attemptNumber}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={
                                  row.isCorrect
                                    ? 'text-green-400'
                                    : 'text-destructive'
                                }
                              >
                                {row.isCorrect ? '정답' : '오답'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);
  const season =
    typeof context.query.season === 'string' ? context.query.season.trim() : '';

  if (!season) {
    return { notFound: true };
  }

  const allSettings = await prisma.playgroundSettings.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const normalizedSeason = normalizeSeasonKey(season);
  const matched = allSettings.find((item) => {
    const codeName = normalizeSeasonKey(item.codeName || '');
    const seasonName = normalizeSeasonKey(item.season || '');
    return codeName === normalizedSeason || seasonName === normalizedSeason;
  });

  if (!matched) {
    return { notFound: true };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      season: matched.codeName || season,
      isCurrentUserAdmin: user ? isAdmin(user.role) : false,
    },
  };
};

PlaygroundSeasonPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default PlaygroundSeasonPage;
