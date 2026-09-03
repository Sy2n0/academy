import {
  type ReactElement,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  List,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Cloud,
  Swords,
} from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  UrlPreview,
  HeapVisualizer,
  CodeRunner,
} from '@/components/learn/InteractiveBlock';
import {
  QuizBlock,
  TerminalBlock,
  JsonFormatter,
  FileDownloadBlock,
  ChecklistBlock,
  ApiTestBlock,
} from '@/components/learn/AdditionalBlocks';
import {
  CryptoBlock,
  HexDumpBlock,
  SqlInjectionBlock,
  XssTestBlock,
  PortScannerBlock,
  LogAnalyzerBlock,
  PacketAnalyzerBlock,
} from '@/components/learn/SecurityBlocks';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';

interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string;
  difficulty: string;
  duration: string | null;
  tier: string;
  type: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TrackModule {
  id: string;
  moduleId: string;
  order: number;
  isCompleted: boolean;
  module: Module;
}

interface Track {
  id: string;
  title: string;
  modules: TrackModule[];
}

const QUIZ_RE = /\[quiz:([\s\S]*?)\]/g;

/**
 * Split lecture markdown into one step per section.
 *
 * The step navigation on this page (arrow keys, dots, prev/next, the step
 * progress bar) was fully built but fed a single-element array, so none of it
 * ever appeared and every module rendered as one long scroll.
 *
 * Sections are `###`. `#` looks like a heading but in this content it is almost
 * always a shell comment inside a ``` fence — splitting on it would tear code
 * blocks in half — so the walk tracks fence state and only breaks on headings
 * that are genuinely outside one. Whatever precedes the first `###` (the `##`
 * title and its intro) becomes the opening step.
 */
function splitIntoSteps(markdown: string): string[] {
  const lines = markdown.split('\n');
  const steps: string[] = [];
  let current: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
    } else if (!inFence && /^###\s+\S/.test(line)) {
      if (current.some((l) => l.trim())) steps.push(current.join('\n').trim());
      current = [];
    }
    current.push(line);
  }
  if (current.some((l) => l.trim())) steps.push(current.join('\n').trim());

  // An unsplittable document stays one step; hasSteps then stays false and the
  // navigation hides itself, as it did before.
  return steps.length > 0 ? steps : [markdown];
}

const PROSE_CLASSES = `prose dark:prose-invert max-w-none
  prose-p:text-foreground/90 prose-p:leading-7 prose-p:text-base prose-p:my-4
  prose-headings:text-foreground prose-headings:font-medium prose-headings:tracking-tight prose-headings:scroll-mt-6
  prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-3 prose-h1:pb-2 prose-h1:border-b prose-h1:border-[var(--warp-rule)]
  prose-h2:text-xl prose-h2:mt-7 prose-h2:mb-2
  prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-1.5 prose-h3:text-foreground
  prose-strong:text-foreground prose-strong:font-medium
  prose-a:text-foreground prose-a:no-underline hover:prose-a:underline
  prose-code:text-foreground prose-code:bg-[var(--warp-surface)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-[var(--warp-surface)] prose-pre:border prose-pre:border-[var(--warp-rule)] prose-pre:rounded-md prose-pre:text-sm
  prose-blockquote:border-l-2 prose-blockquote:border-[var(--warp-ash)]/40 prose-blockquote:text-muted-foreground prose-blockquote:not-italic  prose-blockquote:py-0.5 prose-blockquote:pr-4
  prose-hr:border-[var(--warp-rule)]
  prose-li:text-foreground/90 prose-li:leading-7 prose-li:text-base prose-li:marker:text-muted-foreground
  prose-ul:my-2 prose-ol:my-2
  prose-table:text-sm
  prose-th:text-foreground prose-th:font-semibold
  prose-td:text-foreground`;

// [quiz:question|option1|option2|...|answerIndex] 패턴을 인식하여 렌더링
const RichContent = ({ content }: { content: string }) => {
  const segments: Array<
    | { type: 'md'; text: string }
    | { type: 'quiz'; question: string; options: string[]; answer: number }
  > = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(QUIZ_RE.source, 'g');

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'md',
        text: content.slice(lastIndex, match.index),
      });
    }
    const parts = match[1].split('|');
    const question = parts[0] ?? '';
    const answerIdx = parseInt(parts[parts.length - 1] ?? '0', 10);
    const options = parts.slice(1, parts.length - 1);
    segments.push({ type: 'quiz', question, options, answer: answerIdx });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'md', text: content.slice(lastIndex) });
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'quiz' ? (
          <QuizBlock
            key={i}
            question={seg.question}
            options={seg.options}
            answer={seg.answer}
          />
        ) : (
          <div key={i} className={PROSE_CLASSES}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {seg.text}
            </ReactMarkdown>
          </div>
        )
      )}
    </>
  );
};

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('불러오기에 실패했습니다');
  }
  return res.json();
};

const TrackModuleDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { trackId, id: moduleId } = router.query;
  const [mounted, setMounted] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0])
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [cloudIdeSplit, setCloudIdeSplit] = useState(false);
  const [cloudIdeUrl, setCloudIdeUrl] = useState<string | null>(null);
  const [cloudIdePassword, setCloudIdePassword] = useState('');
  const [cloudIdeLaunching, setCloudIdeLaunching] = useState(false);
  const [attackBoxLaunching, setAttackBoxLaunching] = useState(false);
  const [attackBoxSplit, setAttackBoxSplit] = useState(false);
  const [attackBoxWebUrl, setAttackBoxWebUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  // Furthest step this reader has reached. The completion gate checks this
  // rather than currentStep, so paging back to re-read something does not
  // re-lock a module you have already read to the end.
  const [furthestStep, setFurthestStep] = useState(0);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: trackData, mutate: mutateTrack } = useSWR<{ data: Track }>(
    trackId ? `/api/learn/tracks/${trackId}` : null,
    fetcher
  );

  const {
    data: moduleData,
    error,
    isLoading,
  } = useSWR<{ data: Module }>(
    moduleId ? `/api/learn/modules/${moduleId}` : null,
    fetcher
  );

  const { data: noteData, mutate: mutateNote } = useSWR<{
    data: { id: string; content: string | null } | null;
  }>(moduleId ? `/api/learn/modules/${moduleId}/note` : null, fetcher);

  useEffect(() => {
    if (noteData?.data?.content !== undefined) {
      setNoteContent(noteData.data.content || '');
    }
  }, [noteData]);

  const module = moduleData?.data;
  const track = trackData?.data;

  const currentModuleIndex =
    track?.modules.findIndex((tm) => tm.moduleId === moduleId) ?? -1;
  const currentModule = track?.modules[currentModuleIndex];
  const prevModule =
    currentModuleIndex > 0 ? track?.modules[currentModuleIndex - 1] : null;
  const nextModule =
    currentModuleIndex >= 0 && track?.modules[currentModuleIndex + 1]
      ? track?.modules[currentModuleIndex + 1]
      : null;

  const completedCount =
    track?.modules.filter((m) => m.isCompleted).length ?? 0;
  const totalModules = track?.modules.length ?? 0;
  const progress =
    totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  const currentSectionNumber = currentModuleIndex + 1;
  const totalSections = totalModules;

  const handleComplete = async () => {
    if (!moduleId) return;
    try {
      const response = await fetch(`/api/learn/modules/${moduleId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || '모듈 완료 처리에 실패했습니다'
        );
      }
      toast.success('Module completed successfully!');
      mutateTrack();
    } catch (error: any) {
      toast.error(error.message || '모듈 완료 처리에 실패했습니다');
    }
  };

  const handleNext = () => {
    if (nextModule) {
      router.push(`/learn/tracks/${trackId}/modules/${nextModule.moduleId}`);
    }
  };

  const handleMarkCompleteAndNext = async () => {
    await handleComplete();
    if (nextModule) {
      setTimeout(() => {
        router.push(`/learn/tracks/${trackId}/modules/${nextModule.moduleId}`);
      }, 500);
    }
  };

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const handleSaveNote = async () => {
    if (!moduleId) return;
    setIsSavingNote(true);
    try {
      const response = await fetch(`/api/learn/modules/${moduleId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: noteContent }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '노트 저장에 실패했습니다');
      }
      toast.success('Note saved successfully');
      mutateNote();
    } catch (error: any) {
      toast.error(error.message || '노트 저장에 실패했습니다');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleNoteOpen = () => {
    setShowNotes(true);
    setTocOpen(false);
    if (noteData?.data === undefined) {
      mutateNote();
    }
  };

  const handleCloudIdeClick = async () => {
    if (cloudIdeSplit) {
      setCloudIdeSplit(false);
      setCloudIdeUrl(null);
      setCloudIdePassword('');
      return;
    }
    setAttackBoxSplit(false);
    setCloudIdeLaunching(true);
    try {
      const statusRes = await fetch('/api/cloud-ide/status', {
        credentials: 'include',
      });
      const statusJson = await statusRes.json().catch(() => ({}));
      if (statusJson?.data) {
        const d = statusJson.data;
        const url = `http://${window.location.hostname}:${d.port}/`;
        setCloudIdeUrl(url);
        setCloudIdePassword(d.password ?? '');
        setCloudIdeSplit(true);
        setTocOpen(false);
        setShowNotes(false);
        setCloudIdeLaunching(false);
        return;
      }
      const launchRes = await fetch('/api/cloud-ide/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const launchJson = await launchRes.json().catch(() => ({}));
      if (!launchRes.ok) {
        throw new Error(
          launchJson?.error?.detail ??
            launchJson?.error?.message ??
            'Cloud IDE 실행 실패'
        );
      }
      const port = launchJson.port;
      const password = launchJson.password ?? '';
      const url = `http://${window.location.hostname}:${port}/`;
      setCloudIdeUrl(url);
      setCloudIdePassword(password);
      setCloudIdeSplit(true);
      setTocOpen(false);
      setShowNotes(false);
      toast.success('Cloud IDE가 실행되었습니다.');
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Cloud IDE 실행에 실패했습니다.'
      );
    } finally {
      setCloudIdeLaunching(false);
    }
  };

  const handleAttackBoxClick = async () => {
    if (attackBoxSplit) {
      setAttackBoxSplit(false);
      setAttackBoxWebUrl(null);
      return;
    }
    setAttackBoxLaunching(true);
    try {
      const statusRes = await fetch('/api/attackbox/status', {
        credentials: 'include',
      });
      const statusJson = await statusRes.json().catch(() => ({}));
      if (statusJson?.data) {
        const d = statusJson.data;
        const url = `/tool/attackbox/${d.port8080}/`;
        setAttackBoxWebUrl(url);
        setCloudIdeSplit(false);
        setAttackBoxSplit(true);
        setTocOpen(false);
        setShowNotes(false);
        setAttackBoxLaunching(false);
        return;
      }
      const launchRes = await fetch('/api/attackbox/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image: '@PLATFORM/HUB-ATTACKBOX/kali-rolling' }),
      });
      const launchJson = await launchRes.json().catch(() => ({}));
      if (!launchRes.ok) {
        throw new Error(
          launchJson?.error?.detail ??
            launchJson?.error?.message ??
            'Attack Box 실행 실패'
        );
      }
      const url = `/tool/attackbox/${launchJson.port8080}/`;
      setAttackBoxWebUrl(url);
      toast.success('Attack Box가 실행되었습니다.');
      setCloudIdeSplit(false);
      setAttackBoxSplit(true);
      setTocOpen(false);
      setShowNotes(false);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Attack Box 실행에 실패했습니다.'
      );
    } finally {
      setAttackBoxLaunching(false);
    }
  };

  // ### 기준으로 콘텐츠를 스텝으로 분할 (hooks must be before early returns)
  const contentSteps = useMemo(() => {
    if (!module?.content) return [];
    return splitIntoSteps(module.content);
  }, [module?.content]);

  const totalContentSteps = contentSteps.length;
  const hasSteps = totalContentSteps > 1;

  // 모듈 바뀌면 localStorage에서 저장된 스텝 복원 (없으면 0)
  useEffect(() => {
    if (!moduleId) return;
    const saved =
      typeof window !== 'undefined'
        ? parseInt(localStorage.getItem(`step:${moduleId}`) ?? '0', 10)
        : 0;
    const start = Number.isFinite(saved) ? saved : 0;
    setCurrentStep(start);
    const seen =
      typeof window !== 'undefined'
        ? parseInt(localStorage.getItem(`furthest:${moduleId}`) ?? '0', 10)
        : 0;
    setFurthestStep(Math.max(Number.isFinite(seen) ? seen : 0, start));
  }, [moduleId]);

  // 스텝 바뀔 때마다 localStorage에 저장
  useEffect(() => {
    if (!moduleId || typeof window === 'undefined') return;
    localStorage.setItem(`step:${moduleId}`, String(currentStep));
    setFurthestStep((f) => {
      const next = Math.max(f, currentStep);
      localStorage.setItem(`furthest:${moduleId}`, String(next));
      return next;
    });
  }, [currentStep, moduleId]);

  // Turning a page should start it at the top, not wherever the previous one
  // was scrolled to.
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [currentStep]);

  // 키보드 좌우 화살표로 스텝 이동
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!hasSteps) return;
      if (e.key === 'ArrowRight')
        setCurrentStep((s) => Math.min(s + 1, totalContentSteps - 1));
      if (e.key === 'ArrowLeft') setCurrentStep((s) => Math.max(s - 1, 0));
    },
    [hasSteps, totalContentSteps]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center justify-center h-screen">
              <p className=" text-sm text-muted-foreground">
                Loading module...
              </p>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <p className=" text-sm text-destructive mb-4">
                  모듈을 불러오지 못했습니다
                </p>
                <Button
                  onClick={() => router.push(`/learn/tracks/${trackId}`)}
                  variant="outline"
                  className=" text-xs"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Track
                </Button>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }

  const sections =
    track?.modules.map((tm, index) => ({
      id: index,
      title: tm.module.title,
      modules: [tm],
    })) ?? [];

  return (
    <div className="h-svh overflow-hidden bg-background">
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden bg-background">
          {/* 상단 진행률 바 */}
          <div className="h-0.5 w-full shrink-0 bg-[var(--warp-rule)]">
            {/* 트랙 전체 진행률 (베이스) */}
            <div
              className="h-full bg-[var(--warp-ash)]/30 transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* 현재 모듈 스텝 진행률 */}
          {hasSteps && (
            <div className="h-0.5 w-full bg-transparent flex-shrink-0 -mt-0.5">
              <div
                className="h-full bg-[var(--warp-parchment)] transition-[width] duration-300 ease-out"
                style={{
                  width: `${Math.round(((currentStep + 1) / totalContentSteps) * 100)}%`,
                }}
              />
            </div>
          )}

          <AppTopBar
            crumbs={[
              { label: 'Tracks', href: '/learn/tracks' },
              {
                label: track?.title ?? 'Track',
                href: `/learn/tracks/${trackId}`,
              },
              { label: module.title },
            ]}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={cloudIdeSplit}
                  onClick={handleCloudIdeClick}
                  disabled={cloudIdeLaunching}
                  className={`h-7 gap-1.5 px-2.5 text-[11px] uppercase tracking-[0.1em] ${
                    cloudIdeSplit
                      ? 'bg-[var(--warp-veil)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Cloud className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cloud IDE</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={attackBoxSplit}
                  onClick={handleAttackBoxClick}
                  disabled={attackBoxLaunching}
                  className={`h-7 gap-1.5 px-2.5 text-[11px] uppercase tracking-[0.1em] ${
                    attackBoxSplit
                      ? 'bg-[var(--warp-veil)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Attack Box</span>
                </Button>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-pressed={showNotes}
                  onClick={handleNoteOpen}
                  className={`h-7 w-7 ${showNotes ? 'bg-[var(--warp-veil)] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Notes"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-pressed={tocOpen && !showNotes}
                  onClick={() => {
                    setTocOpen(!tocOpen);
                    setShowNotes(false);
                  }}
                  className={`h-7 w-7 ${tocOpen && !showNotes ? 'bg-[var(--warp-veil)] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Table of Contents"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </>
            }
          />

          {/* ── Body ── */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* ── Main content (Notion doc style) ── */}
            <div
              ref={contentScrollRef}
              className="min-w-0 flex-1 overflow-y-auto"
            >
              <div className="max-w-3xl mx-auto px-6 md:px-12 pt-12 pb-32">
                {/* Page title */}
                <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight tracking-tight mb-3">
                  {module.title}
                </h1>

                {/* Meta: 한 줄 */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                  <span>{module.category}</span>
                  <span>·</span>
                  <span>{module.difficulty}</span>
                  {module.duration && (
                    <>
                      <span>·</span>
                      <span>{module.duration}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>
                    {currentSectionNumber} of {totalSections}
                  </span>
                </div>

                <div className="h-px bg-border/30 mb-6" />

                {/* Step navigation (if content has ### sections) */}
                {hasSteps && (
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setCurrentStep((s) => Math.max(s - 1, 0))}
                      disabled={currentStep === 0}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-white/[0.04]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Prev
                    </button>
                    {contentSteps.length <= 12 ? (
                      <div className="flex items-center gap-1.5">
                        {contentSteps.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentStep(i)}
                            aria-label={`Step ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                              i === currentStep
                                ? 'w-5 bg-[var(--warp-parchment)]'
                                : 'w-1.5 bg-[var(--warp-rule)] hover:bg-[var(--warp-ash)]'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="warp-num text-xs text-muted-foreground">
                        <span className="text-foreground">
                          {currentStep + 1}
                        </span>
                        {' / '}
                        {totalContentSteps}
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setCurrentStep((s) =>
                          Math.min(s + 1, totalContentSteps - 1)
                        )
                      }
                      disabled={currentStep === totalContentSteps - 1}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-white/[0.04]"
                    >
                      Next
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Content */}
                {module.content ? (
                  <RichContent
                    content={
                      hasSteps
                        ? (contentSteps[currentStep] ?? '')
                        : module.content
                    }
                  />
                ) : (
                  <div className="py-24 text-center">
                    <p className="text-sm text-muted-foreground">
                      No content available for this module.
                    </p>
                  </div>
                )}

                {/* Bottom nav (Notion-style inline prev/next) */}
                <div className="mt-20 pt-6 border-t border-[var(--warp-rule)] flex items-center justify-between">
                  <div>
                    {prevModule ? (
                      <button
                        onClick={() =>
                          router.push(
                            `/learn/tracks/${trackId}/modules/${prevModule.moduleId}`
                          )
                        }
                        className="flex flex-col gap-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <ArrowLeft className="h-3 w-3" /> Previous
                        </span>
                        <span className="text-sm text-foreground">
                          {prevModule.module.title}
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                  <div className="text-right">
                    {!currentModule?.isCompleted ? (
                      (() => {
                        const reachedEnd =
                          !hasSteps || furthestStep >= totalContentSteps - 1;
                        return reachedEnd ? (
                          <button
                            onClick={handleMarkCompleteAndNext}
                            className="flex flex-col gap-1 text-right items-end hover:opacity-80 transition-opacity"
                          >
                            <span className="text-[11px] text-foreground flex items-center gap-1">
                              Mark complete {nextModule ? '& next' : ''}{' '}
                              <CheckCircle2 className="h-3 w-3" />
                            </span>
                            {nextModule && (
                              <span className="text-sm text-foreground">
                                {nextModule.module.title}
                              </span>
                            )}
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1 items-end">
                            <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1 cursor-not-allowed select-none">
                              Mark complete <CheckCircle2 className="h-3 w-3" />
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCurrentStep(totalContentSteps - 1)
                              }
                              className="text-[10px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                              <span className="warp-num">
                                {totalContentSteps - furthestStep - 1}
                              </span>{' '}
                              step
                              {totalContentSteps - furthestStep - 1 > 1
                                ? 's'
                                : ''}{' '}
                              left — skip to end
                            </button>
                          </div>
                        );
                      })()
                    ) : nextModule ? (
                      <button
                        onClick={handleNext}
                        className="flex flex-col gap-1 text-right items-end hover:opacity-80 transition-opacity"
                      >
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          Next <ArrowRight className="h-3 w-3" />
                        </span>
                        <span className="text-sm text-foreground">
                          {nextModule.module.title}
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">All done!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right panel: Cloud IDE ── */}
            {cloudIdeSplit && cloudIdeUrl && (
              <div className="flex-1 min-w-0 flex flex-col border-l border-[var(--warp-rule)]">
                <div className="h-11 border-b border-[var(--warp-rule)] flex items-center justify-between px-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      Cloud IDE
                    </span>
                    {cloudIdePassword && (
                      <span className="text-[11px] text-muted-foreground">
                        pw:{' '}
                        <code className="bg-muted/50 px-1 rounded">
                          {cloudIdePassword}
                        </code>
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setCloudIdeSplit(false);
                      setCloudIdeUrl(null);
                      setCloudIdePassword('');
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0 w-full">
                  <iframe
                    src={cloudIdeUrl}
                    title="Cloud IDE"
                    className="w-full h-full border-0"
                    allow="fullscreen"
                  />
                </div>
              </div>
            )}

            {/* ── Right panel: Attack Box ── */}
            {attackBoxSplit && attackBoxWebUrl && (
              <div className="flex-1 min-w-0 flex flex-col border-l border-[var(--warp-rule)]">
                <div className="h-11 border-b border-[var(--warp-rule)] flex items-center justify-between px-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      Attack Box
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setAttackBoxSplit(false);
                      setAttackBoxWebUrl(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0 w-full">
                  <iframe
                    src={attackBoxWebUrl}
                    title="Attack Box"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}

            {/* ── Right sidebar: TOC / Notes (Notion-style) ── */}
            {(tocOpen || showNotes) && !cloudIdeSplit && !attackBoxSplit && (
              <div className="w-64 border-l border-[var(--warp-rule)] flex flex-col flex-shrink-0 bg-[var(--warp-surface)]">
                {/* Sidebar top */}
                <div className="h-11 flex items-center justify-between px-3 flex-shrink-0 border-b border-[var(--warp-rule)]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTocOpen(true);
                        setShowNotes(false);
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${tocOpen && !showNotes ? 'text-foreground bg-[var(--warp-veil)]' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Contents
                    </button>
                    <button
                      onClick={() => {
                        setShowNotes(true);
                        setTocOpen(false);
                        if (noteData?.data === undefined) mutateNote();
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${showNotes ? 'text-foreground bg-[var(--warp-veil)]' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Notes
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setTocOpen(false);
                      setShowNotes(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* TOC */}
                  {tocOpen && !showNotes && (
                    <div className="py-2">
                      {/* Progress */}
                      <div className="px-4 py-3 mb-1 space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1.5">
                            <span className="text-muted-foreground">Track</span>
                            <span className="text-foreground">{progress}%</span>
                          </div>
                          <div className="h-0.5 rounded-full bg-border/30 overflow-hidden">
                            <div
                              className="h-full bg-[var(--warp-parchment)] transition-[width] duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        {hasSteps && (
                          <div>
                            <div className="flex justify-between text-[11px] mb-1.5">
                              <span className="text-muted-foreground">
                                Module
                              </span>
                              <span className="text-foreground">
                                {currentStep + 1} / {totalContentSteps}
                              </span>
                            </div>
                            <div className="h-0.5 rounded-full bg-border/30 overflow-hidden">
                              <div
                                className="h-full bg-[var(--warp-parchment)] transition-[width] duration-300"
                                style={{
                                  width: `${Math.round(((currentStep + 1) / totalContentSteps) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {sections.map((section, i) => {
                        const tm = section.modules[0];
                        const isCurrent = tm.moduleId === moduleId;
                        const isCompleted = tm.isCompleted;
                        return (
                          <button
                            key={section.id}
                            onClick={() =>
                              router.push(
                                `/learn/tracks/${trackId}/modules/${tm.moduleId}`
                              )
                            }
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors group ${
                              isCurrent
                                ? 'bg-[var(--warp-veil)]'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            {/* check / dot */}
                            <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                              {isCompleted ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                              ) : (
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-foreground' : 'bg-border'}`}
                                />
                              )}
                            </div>
                            <span
                              className={`text-xs leading-snug truncate ${
                                isCurrent
                                  ? 'text-foreground font-medium'
                                  : 'text-muted-foreground group-hover:text-foreground'
                              }`}
                            >
                              {tm.module.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Notes */}
                  {showNotes && (
                    <div className="flex flex-col h-full p-3 gap-2">
                      <Textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Add a note..."
                        className="text-sm flex-1 min-h-[400px] resize-none bg-transparent border-0 focus-visible:ring-0 p-0 text-foreground/80 placeholder:text-muted-foreground/50"
                      />
                      <button
                        onClick={handleSaveNote}
                        disabled={isSavingNote}
                        className="text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors text-right"
                      >
                        {isSavingNote ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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

TrackModuleDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default TrackModuleDetailPage;
