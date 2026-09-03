import { ExerciseChecklist } from '@/components/learn/ExerciseChecklist';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopBar } from '@/components/layouts/AppTopBar';
import {
  ToolPanelContext,
  type ToolPanel,
} from '@/components/learn/ToolPanelContext';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Cloud, Swords, X } from 'lucide-react';
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
import { GuiCliCompare } from '@/components/learn/CompareBlock';

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

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('불러오기에 실패했습니다');
  }
  return res.json();
};

const ModuleDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [mounted, setMounted] = useState(false);
  const [cloudIdeSplit, setCloudIdeSplit] = useState(false);
  const [cloudIdeUrl, setCloudIdeUrl] = useState<string | null>(null);
  const [cloudIdePassword, setCloudIdePassword] = useState('');
  const [cloudIdeContainerName, setCloudIdeContainerName] = useState<
    string | null
  >(null);
  const [cloudIdeStopping, setCloudIdeStopping] = useState(false);
  const [cloudIdeLaunching, setCloudIdeLaunching] = useState(false);
  const [attackBoxLaunching, setAttackBoxLaunching] = useState(false);
  const [attackBoxSplit, setAttackBoxSplit] = useState(false);
  const [attackBoxWebUrl, setAttackBoxWebUrl] = useState<string | null>(null);
  const [attackBoxContainerName, setAttackBoxContainerName] = useState<
    string | null
  >(null);
  const [attackBoxStopping, setAttackBoxStopping] = useState(false);

  // Panel opened from inside the lecture content (the terminal block).
  const [toolPanel, setToolPanel] = useState<ToolPanel | null>(null);
  const closeToolPanel = useCallback(async () => {
    const panel = toolPanel;
    setToolPanel(null);
    await panel?.onClose?.();
  }, [toolPanel]);
  const toolPanelApi = useMemo(
    () => ({
      open: (panel: ToolPanel) => {
        // One split at a time, as Cloud IDE and Attack Box already behave.
        setCloudIdeSplit(false);
        setAttackBoxSplit(false);
        setToolPanel(panel);
      },
      close: () => {
        void closeToolPanel();
      },
      current: toolPanel,
    }),
    [toolPanel, closeToolPanel]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, error, isLoading } = useSWR<{ data: Module }>(
    id ? `/api/learn/modules/${id}` : null,
    fetcher
  );

  const { data: statusData, mutate: mutateStatus } = useSWR<{
    data: { completed: boolean; completedAt: string | null };
  }>(id ? `/api/learn/modules/${id}/status` : null, fetcher);

  const module = data?.data;
  const isCompleted = statusData?.data?.completed || false;
  const completedAt = statusData?.data?.completedAt;
  const isToolSplit = cloudIdeSplit || attackBoxSplit || !!toolPanel;

  const resolveToolHost = (apiHost?: string) => {
    if (typeof apiHost === 'string' && apiHost.trim()) {
      return apiHost.trim();
    }
    if (typeof window !== 'undefined' && window.location.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  };

  const handleCloudIdeClick = async () => {
    if (cloudIdeSplit) {
      setCloudIdeSplit(false);
      setCloudIdeUrl(null);
      setCloudIdePassword('');
      setCloudIdeContainerName(null);
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
        const url = `/tool/cloud-ide/${d.port}/`;
        setCloudIdeUrl(url);
        setCloudIdePassword(d.password ?? '');
        setCloudIdeContainerName(
          typeof d.containerName === 'string' ? d.containerName : null
        );
        setCloudIdeSplit(true);
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
      const url = `/tool/cloud-ide/${port}/`;
      setCloudIdeUrl(url);
      setCloudIdePassword(password);
      setCloudIdeContainerName(
        typeof launchJson.containerName === 'string'
          ? launchJson.containerName
          : null
      );
      setCloudIdeSplit(true);
      toast.success('Cloud IDE가 실행되었습니다.');
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Cloud IDE 실행에 실패했습니다.'
      );
    } finally {
      setCloudIdeLaunching(false);
    }
  };

  const handleCloudIdeClose = async () => {
    setCloudIdeStopping(true);
    try {
      const res = await fetch('/api/cloud-ide/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          cloudIdeContainerName ? { containerName: cloudIdeContainerName } : {}
        ),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error?.message || 'Cloud IDE 중지에 실패했습니다.'
        );
      }

      toast.success('Cloud IDE가 종료되었습니다.');
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Cloud IDE 종료에 실패했습니다.'
      );
    } finally {
      setCloudIdeStopping(false);
      setCloudIdeSplit(false);
      setCloudIdeUrl(null);
      setCloudIdePassword('');
      setCloudIdeContainerName(null);
    }
  };

  const handleAttackBoxClick = async () => {
    if (attackBoxSplit) {
      setAttackBoxSplit(false);
      setAttackBoxWebUrl(null);
      return;
    }
    setAttackBoxLaunching(true);
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    try {
      const statusRes = await fetch('/api/attackbox/status', {
        credentials: 'include',
      });
      const statusJson = await statusRes.json().catch(() => ({}));
      if (statusJson?.data) {
        const d = statusJson.data;
        const url = `${window.location.protocol}//${window.location.hostname}/tool/attackbox/${d.port8080}/`;
        setAttackBoxWebUrl(url);
        setAttackBoxContainerName(
          typeof d.containerName === 'string' ? d.containerName : null
        );
        setCloudIdeSplit(false);
        setAttackBoxSplit(true);
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
      const url = `${window.location.origin}/tool/attackbox/${launchJson.port8080}/`;
      setAttackBoxWebUrl(url);
      setAttackBoxContainerName(
        typeof launchJson.containerName === 'string'
          ? launchJson.containerName
          : null
      );
      toast.success('Attack Box가 실행되었습니다.');
      setCloudIdeSplit(false);
      setAttackBoxSplit(true);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Attack Box 실행에 실패했습니다.'
      );
    } finally {
      setAttackBoxLaunching(false);
    }
  };

  const handleAttackBoxClose = async () => {
    const containerName = attackBoxContainerName;

    if (!containerName) {
      setAttackBoxSplit(false);
      setAttackBoxWebUrl(null);
      return;
    }

    setAttackBoxStopping(true);
    try {
      const res = await fetch('/api/attackbox/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ containerName }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error?.message || 'Attack Box 중지에 실패했습니다.'
        );
      }

      toast.success('Attack Box가 종료되었습니다.');
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Attack Box 종료에 실패했습니다.'
      );
    } finally {
      setAttackBoxStopping(false);
      setAttackBoxSplit(false);
      setAttackBoxWebUrl(null);
      setAttackBoxContainerName(null);
    }
  };

  const handleComplete = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/learn/modules/${id}/complete`, {
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
      mutateStatus(); // 상태 새로고침
    } catch (error: any) {
      toast.error(error.message || '모듈 완료 처리에 실패했습니다');
    }
  };

  // Markdown with custom components renderer
  const MarkdownWithComponents = ({
    content: markdownContent,
  }: {
    content: string;
  }) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const allMatches: Array<{
      type: string;
      start: number;
      end: number;
      props: any;
    }> = [];

    let match;

    const urlPattern = /\[url:(https?:\/\/[^\]]+)\]/g;
    while ((match = urlPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'url',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { url: match[1] },
      });
    }

    const heapPattern = /\[heap:([^\]]+)\]/g;
    while ((match = heapPattern.exec(markdownContent)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        allMatches.push({
          type: 'heap',
          start: match.index!,
          end: match.index! + match[0].length,
          props: { data: JSON.stringify(data) },
        });
      } catch {
        allMatches.push({
          type: 'heap',
          start: match.index!,
          end: match.index! + match[0].length,
          props: {},
        });
      }
    }

    const codeRunPattern = /\[run:(\w+)\]([\s\S]*?)\[\/run\]/g;
    while ((match = codeRunPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'code',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { code: match[2].trim(), language: match[1] },
      });
    }

    const quizPattern = /\[quiz:([^\]]+)\]/g;
    while ((match = quizPattern.exec(markdownContent)) !== null) {
      try {
        const p = match[1].split('|');
        if (p.length >= 3) {
          allMatches.push({
            type: 'quiz',
            start: match.index!,
            end: match.index! + match[0].length,
            props: {
              question: p[0],
              options: p.slice(1, -1),
              answer: parseInt(p[p.length - 1]),
            },
          });
        }
      } catch {
        // ignore malformed embedded block
      }
    }

    const terminalPattern = /\[terminal\]([\s\S]*?)\[\/terminal\]/g;
    while ((match = terminalPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'terminal',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { commands: match[1].trim() },
      });
    }

    const jsonPattern = /\[json:([^\]]+)\]/g;
    while ((match = jsonPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'json',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { data: match[1] },
      });
    }

    const filePattern = /\[file:([^\]]+)\]/g;
    while ((match = filePattern.exec(markdownContent)) !== null) {
      const p = match[1].split('|');
      allMatches.push({
        type: 'file',
        start: match.index!,
        end: match.index! + match[0].length,
        props: {
          filename: p[0] || 'file.txt',
          content: p[1] || '',
          mimetype: p[2] || 'text/plain',
        },
      });
    }

    const checklistPattern = /\[checklist:([^\]]+)\]/g;
    while ((match = checklistPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'checklist',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { items: match[1].split('|').filter(Boolean) },
      });
    }

    const apiPattern = /\[api:([^\]]+)\]/g;
    while ((match = apiPattern.exec(markdownContent)) !== null) {
      try {
        const p = match[1].split('|');
        allMatches.push({
          type: 'api',
          start: match.index!,
          end: match.index! + match[0].length,
          props: {
            endpoint: p[0] || '',
            method: p[1] || 'GET',
            headers: p[2] ? JSON.parse(p[2]) : {},
            body: p[3] || '',
          },
        });
      } catch {
        // ignore malformed embedded block
      }
    }

    const cryptoPattern = /\[crypto:([^\]]+)\]/g;
    while ((match = cryptoPattern.exec(markdownContent)) !== null) {
      const p = match[1].split('|');
      allMatches.push({
        type: 'crypto',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { type: p[0] || 'base64', data: p[1] || '' },
      });
    }

    const hexdumpPattern = /\[hexdump:([^\]]+)\]/g;
    while ((match = hexdumpPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'hexdump',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { data: match[1] },
      });
    }

    const sqliPattern = /\[sqli:([^\]]+)\]/g;
    while ((match = sqliPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'sqli',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { query: match[1] },
      });
    }

    const xssPattern = /\[xss:([^\]]+)\]/g;
    while ((match = xssPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'xss',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { payload: match[1] },
      });
    }

    const portscanPattern = /\[portscan:([^\]]+)\]/g;
    while ((match = portscanPattern.exec(markdownContent)) !== null) {
      const p = match[1].split('|');
      allMatches.push({
        type: 'portscan',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { target: p[0] || 'localhost', ports: p[1] || '1-100' },
      });
    }

    const loganalyzerPattern = /\[loganalyzer:([^\]]+)\]/g;
    while ((match = loganalyzerPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'loganalyzer',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { logs: match[1] },
      });
    }

    const packetPattern = /\[packet:([^\]]+)\]/g;
    while ((match = packetPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'packet',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { packet: match[1] },
      });
    }

    const comparePattern =
      /\[compare(?::([^\]]*))?\]([\s\S]*?)\[---\]([\s\S]*?)\[\/compare\]/g;
    while ((match = comparePattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'compare',
        start: match.index!,
        end: match.index! + match[0].length,
        props: {
          title: match[1]?.trim() || undefined,
          guiContent: match[2],
          cliContent: match[3],
        },
      });
    }

    allMatches.sort((a, b) => a.start - b.start);

    allMatches.forEach((item, index) => {
      if (item.start > lastIndex) {
        const beforeText = markdownContent.substring(lastIndex, item.start);
        if (beforeText.trim()) {
          parts.push(
            <ReactMarkdown
              key={`md-before-${index}`}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {beforeText}
            </ReactMarkdown>
          );
        }
      }

      if (item.type === 'url') {
        parts.push(<UrlPreview key={`url-${index}`} url={item.props.url} />);
      } else if (item.type === 'heap') {
        parts.push(
          <HeapVisualizer key={`heap-${index}`} data={item.props.data} />
        );
      } else if (item.type === 'code') {
        parts.push(
          <CodeRunner
            key={`code-${index}`}
            code={item.props.code}
            language={item.props.language}
          />
        );
      } else if (item.type === 'quiz') {
        parts.push(
          <QuizBlock
            key={`quiz-${index}`}
            question={item.props.question}
            options={item.props.options}
            answer={item.props.answer}
          />
        );
      } else if (item.type === 'terminal') {
        parts.push(
          <TerminalBlock
            key={`terminal-${index}`}
            commands={item.props.commands}
          />
        );
      } else if (item.type === 'json') {
        parts.push(
          <JsonFormatter key={`json-${index}`} data={item.props.data} />
        );
      } else if (item.type === 'file') {
        parts.push(
          <FileDownloadBlock
            key={`file-${index}`}
            filename={item.props.filename}
            content={item.props.content}
            mimetype={item.props.mimetype}
          />
        );
      } else if (item.type === 'checklist') {
        parts.push(
          <ChecklistBlock key={`checklist-${index}`} items={item.props.items} />
        );
      } else if (item.type === 'api') {
        parts.push(
          <ApiTestBlock
            key={`api-${index}`}
            endpoint={item.props.endpoint}
            method={item.props.method}
            headers={item.props.headers}
            body={item.props.body}
          />
        );
      } else if (item.type === 'crypto') {
        parts.push(
          <CryptoBlock
            key={`crypto-${index}`}
            type={item.props.type}
            data={item.props.data}
          />
        );
      } else if (item.type === 'hexdump') {
        parts.push(
          <HexDumpBlock key={`hexdump-${index}`} data={item.props.data} />
        );
      } else if (item.type === 'sqli') {
        parts.push(
          <SqlInjectionBlock key={`sqli-${index}`} query={item.props.query} />
        );
      } else if (item.type === 'xss') {
        parts.push(
          <XssTestBlock key={`xss-${index}`} payload={item.props.payload} />
        );
      } else if (item.type === 'portscan') {
        parts.push(
          <PortScannerBlock
            key={`portscan-${index}`}
            target={item.props.target}
            ports={item.props.ports}
          />
        );
      } else if (item.type === 'loganalyzer') {
        parts.push(
          <LogAnalyzerBlock
            key={`loganalyzer-${index}`}
            logs={item.props.logs}
          />
        );
      } else if (item.type === 'packet') {
        parts.push(
          <PacketAnalyzerBlock
            key={`packet-${index}`}
            packet={item.props.packet}
          />
        );
      } else if (item.type === 'compare') {
        parts.push(
          <GuiCliCompare
            key={`compare-${index}`}
            title={item.props.title}
            guiContent={item.props.guiContent}
            cliContent={item.props.cliContent}
          />
        );
      }

      lastIndex = item.end;
    });

    if (lastIndex < markdownContent.length) {
      const remaining = markdownContent.substring(lastIndex);
      if (remaining.trim()) {
        parts.push(
          <ReactMarkdown
            key="md-last"
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {remaining}
          </ReactMarkdown>
        );
      }
    }

    if (parts.length === 0) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {markdownContent}
        </ReactMarkdown>
      );
    }

    return <>{parts}</>;
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
        return 'text-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="h-svh overflow-hidden bg-background">
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Modules', href: '/learn/modules' },
                { label: 'Loading' },
              ]}
            />
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading module...</p>
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
            <AppTopBar
              crumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Modules', href: '/learn/modules' },
                { label: 'Error' },
              ]}
            />
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-sm text-destructive">
                  모듈을 불러오지 못했습니다
                </p>
                <Button
                  onClick={() => router.push('/learn/modules')}
                  variant="outline"
                  className="text-xs"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Modules
                </Button>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }

  return (
    <div className="h-svh overflow-hidden bg-background">
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
          <AppTopBar
            crumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Modules', href: '/learn/modules' },
              { label: module.title },
            ]}
            actions={
              <>
                {/* Toggles, so the active one reads as pressed rather than
                  as a differently-coloured button. */}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={cloudIdeSplit}
                  className={`h-8 gap-1.5 text-[11px] uppercase tracking-[0.1em] ${
                    cloudIdeSplit
                      ? 'bg-[var(--warp-veil)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={cloudIdeLaunching}
                  onClick={handleCloudIdeClick}
                >
                  <Cloud className="h-4 w-4 shrink-0" />
                  <span>Cloud IDE</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={attackBoxSplit}
                  className={`h-8 gap-1.5 text-[11px] uppercase tracking-[0.1em] ${
                    attackBoxSplit
                      ? 'bg-[var(--warp-veil)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={attackBoxLaunching}
                  onClick={handleAttackBoxClick}
                >
                  <Swords className="h-4 w-4 shrink-0" />
                  <span>Attack Box</span>
                </Button>
              </>
            }
          />
          <div
            className={`flex min-h-0 flex-1 ${isToolSplit ? 'overflow-hidden' : 'flex-col overflow-y-auto'}`}
          >
            <div
              className={`min-w-0 ${isToolSplit ? 'h-full min-h-0 flex-[0_0_50%] max-w-[50%] overflow-y-auto overscroll-contain border-r border-[var(--warp-rule)]' : ''}`}
            >
              <div className="mx-auto w-full max-w-[880px] p-5 md:px-10 md:py-8">
                <Button
                  onClick={() => router.push('/learn/modules')}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Modules
                </Button>

                <header className="space-y-3">
                  <h1 className="text-3xl leading-tight tracking-tight text-foreground md:text-4xl">
                    {module.title}
                  </h1>

                  {module.description && (
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {module.description}
                    </p>
                  )}

                  {/* Everything the three badges and the four stat boxes
                      carried, on one line. */}
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-y border-[var(--warp-rule)] py-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>{module.category}</span>
                    <span>{module.type}</span>
                    <span className={getDifficultyColor(module.difficulty)}>
                      {module.difficulty}
                    </span>
                    <span className="warp-num">{module.duration || '—'}</span>
                    <span>{module.tier}</span>
                    <span className="ml-auto text-foreground">
                      {isCompleted ? 'Completed' : 'In progress'}
                    </span>
                  </div>
                </header>

                {/* The lecture is the page, so it is not boxed inside a card
                    titled "Learning Material" inside another card. */}
                <section className="mt-8">
                  <div className="space-y-6">
                    {module.content ? (
                      <div
                        className="prose prose-invert max-w-none
                          prose-h1:mt-14 prose-h1:border-t prose-h1:border-[var(--warp-rule)]
                          prose-h1:pt-6 prose-h1:text-base prose-h1:leading-snug
                          prose-p:text-[15px] prose-p:leading-7 prose-p:text-foreground/90
                          prose-li:text-[15px] prose-li:leading-7 prose-li:text-foreground/90
                          prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-foreground
                          prose-h2:mt-12 prose-h2:text-xl
                          prose-h3:mt-8 prose-h3:text-[15px] prose-h4:text-[15px]
                          prose-strong:font-medium prose-strong:text-foreground
                          prose-a:text-foreground prose-a:underline prose-a:underline-offset-4
                          prose-code:rounded prose-code:bg-[var(--warp-surface)] prose-code:px-1 prose-code:py-0.5
                          prose-code:text-[13px] prose-code:font-normal prose-code:text-foreground
                          prose-code:before:content-none prose-code:after:content-none
                          prose-pre:border prose-pre:border-[var(--warp-rule)] prose-pre:bg-[var(--warp-surface)]
                          prose-blockquote:border-l prose-blockquote:border-[var(--warp-ash)]/40
                          prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:text-muted-foreground
                          prose-hr:border-[var(--warp-rule)]
                          prose-img:rounded-md prose-img:border prose-img:border-[var(--warp-rule)]"
                      >
                        <ToolPanelContext.Provider value={toolPanelApi}>
                          <MarkdownWithComponents content={module.content} />
                        </ToolPanelContext.Provider>
                      </div>
                    ) : (
                      <div className="text-center py-14">
                        <p className="text-sm text-muted-foreground">
                          No content available for this module.
                        </p>
                      </div>
                    )}

                    {typeof id === 'string' && (
                      <ExerciseChecklist moduleId={id} />
                    )}

                    <section className="rounded-md border border-[var(--warp-rule)] bg-background/30 p-4">
                      {!isCompleted ? (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            학습을 마쳤다면 완료 처리해 기록을 저장하세요.
                          </p>
                          <Button
                            onClick={handleComplete}
                            className="w-full text-sm bg-[var(--warp-parchment)] text-[var(--warp-void)] hover:bg-[var(--warp-ash)] md:w-auto"
                            size="lg"
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Complete Module
                          </Button>
                        </div>
                      ) : completedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Completed on{' '}
                          {mounted
                            ? new Date(completedAt).toLocaleDateString(
                                'en-US',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )
                            : completedAt}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          This module is completed.
                        </p>
                      )}
                    </section>
                  </div>
                </section>
              </div>
            </div>

            {/* Right panel - Cloud IDE (when split) */}
            {cloudIdeSplit && cloudIdeUrl && (
              <div className="h-full min-h-0 flex-[0_0_50%] max-w-[50%] min-w-0 overflow-hidden flex flex-col bg-card">
                <div className="h-12 border-b border-[var(--warp-rule)] flex items-center justify-between px-3 flex-shrink-0">
                  <span className="text-sm font-medium text-foreground">
                    Cloud IDE
                  </span>
                  <div className="flex items-center gap-2">
                    {cloudIdePassword && (
                      <span className="warp-num text-xs text-muted-foreground">
                        Password:{' '}
                        <code className="bg-[var(--warp-surface)] px-1 rounded">
                          {cloudIdePassword}
                        </code>
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={cloudIdeStopping}
                      onClick={handleCloudIdeClose}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {cloudIdeStopping ? 'Stopping...' : 'Close'}
                    </Button>
                  </div>
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

            {/* Right panel - opened from the lecture body */}
            {toolPanel && (
              <div className="flex h-full min-h-0 min-w-0 max-w-[50%] flex-[0_0_50%] flex-col overflow-hidden bg-card">
                <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[var(--warp-rule)] px-3">
                  <span className="text-sm font-medium text-foreground">
                    {toolPanel.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => void closeToolPanel()}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Close
                  </Button>
                </div>
                <div className="min-h-0 w-full flex-1">
                  <iframe
                    src={toolPanel.url}
                    title={toolPanel.title}
                    className="h-full w-full border-0"
                  />
                </div>
              </div>
            )}

            {/* Right panel - Attack Box (웹 버전, port8080) */}
            {attackBoxSplit && attackBoxWebUrl && (
              <div className="h-full min-h-0 flex-[0_0_50%] max-w-[50%] min-w-0 overflow-hidden flex flex-col bg-card">
                <div className="h-12 border-b border-[var(--warp-rule)] flex items-center justify-between px-3 flex-shrink-0">
                  <span className="text-sm font-medium text-foreground">
                    Attack Box
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={attackBoxStopping}
                    onClick={handleAttackBoxClose}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {attackBoxStopping ? 'Stopping...' : 'Close'}
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

ModuleDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default ModuleDetailPage;
