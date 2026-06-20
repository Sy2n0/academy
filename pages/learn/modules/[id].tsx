import { type ReactElement, useState, useEffect } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Book,
  Clock,
  BarChart3,
  GraduationCap,
  CheckCircle2,
  Cloud,
  Swords,
  X,
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
  const isToolSplit = cloudIdeSplit || attackBoxSplit;

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
        return <Book className="h-4 w-4" />;
      case 'OFFENSIVE':
        return <Book className="h-4 w-4 text-red-500" />;
      case 'DEFENSIVE':
        return <Book className="h-4 w-4 text-blue-500" />;
      default:
        return <Book className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <p className="font-mono text-sm text-muted-foreground">
              Loading module...
            </p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error || !module) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="font-mono text-sm text-destructive mb-4">
                모듈을 불러오지 못했습니다
              </p>
              <Button
                onClick={() => router.push('/learn/modules')}
                variant="outline"
                className="font-mono text-xs"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Modules
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
          <div className="flex items-center gap-2 px-6 md:px-12">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/learn/modules"
                    className="font-mono text-xs uppercase tracking-wider"
                  >
                    Modules
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                    {module.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 px-6 md:px-12">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 font-mono flex items-center gap-1.5 ${cloudIdeSplit ? 'bg-blue-500/20 text-blue-600' : 'text-blue-500 hover:text-blue-600 hover:bg-blue-500/10'}`}
              disabled={cloudIdeLaunching}
              onClick={handleCloudIdeClick}
            >
              <Cloud className="h-4 w-4 shrink-0" />
              <span>Cloud IDE</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 font-mono flex items-center gap-1.5 ${attackBoxSplit ? 'bg-red-500/20 text-red-600' : 'text-red-500 hover:text-red-600 hover:bg-red-500/10'}`}
              disabled={attackBoxLaunching}
              onClick={handleAttackBoxClick}
            >
              <Swords className="h-4 w-4 shrink-0" />
              <span>Attack Box</span>
            </Button>
          </div>
        </header>
        <div
          className={`flex flex-1 min-h-0 ${isToolSplit ? 'h-[calc(100vh-4rem)] overflow-hidden' : 'flex-col gap-6 p-6 md:p-12 pt-6 overflow-y-auto'}`}
        >
          <div
            className={`min-w-0 ${isToolSplit ? 'h-full min-h-0 flex-[0_0_50%] max-w-[50%] overflow-y-auto overscroll-contain p-6 md:p-12 pt-6 border-r border-border/30' : ''}`}
          >
            <div className="max-w-7xl mx-auto w-full space-y-6">
              <Button
                onClick={() => router.push('/learn/modules')}
                variant="ghost"
                size="sm"
                className="font-mono text-xs"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Modules
              </Button>

              <section className="rounded-xl border border-border/30 bg-card p-6 md:p-7 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 font-mono text-[10px] uppercase text-foreground">
                    <GraduationCap className="h-3 w-3" />
                    {module.type}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase ${
                      module.category === 'OFFENSIVE'
                        ? 'border-red-500/35 bg-red-500/10 text-red-400'
                        : module.category === 'DEFENSIVE'
                          ? 'border-blue-500/35 bg-blue-500/10 text-blue-300'
                          : 'border-border/60 bg-background/50 text-foreground'
                    }`}
                  >
                    {getCategoryIcon(module.category)}
                    {module.category}
                  </span>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-green-500/35 bg-green-500/15 px-2.5 py-1 font-mono text-[10px] uppercase text-green-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </span>
                  )}
                </div>

                <h1 className="font-mono text-2xl md:text-3xl text-foreground leading-tight">
                  {module.title}
                </h1>

                {module.description && (
                  <p className="font-mono text-sm leading-6 text-muted-foreground max-w-3xl">
                    {module.description}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-border/30 bg-card">
                <div className="border-b border-border/30 px-6 py-4">
                  <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                    Learning Material
                  </h2>
                </div>
                <div className="p-6 md:p-7 space-y-6">
                  <section className="space-y-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Module Info
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                          Difficulty
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm ${getDifficultyColor(module.difficulty)}`}
                        >
                          {module.difficulty}
                        </p>
                      </div>
                      <div className="rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                          Duration
                        </p>
                        <p className="mt-1 font-mono text-sm text-foreground">
                          {module.duration || 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                          Tier
                        </p>
                        <p className="mt-1 font-mono text-sm text-foreground">
                          {module.tier}
                        </p>
                      </div>
                      <div className="rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                          Status
                        </p>
                        <p className="mt-1 font-mono text-sm text-foreground">
                          {isCompleted ? 'Completed' : 'In Learning'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {module.content ? (
                    <div className="prose dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground max-w-none">
                      <MarkdownWithComponents content={module.content} />
                    </div>
                  ) : (
                    <div className="text-center py-14">
                      <p className="font-mono text-sm text-muted-foreground">
                        No content available for this module.
                      </p>
                    </div>
                  )}

                  <section className="rounded-lg border border-border/40 bg-background/30 p-4">
                    {!isCompleted ? (
                      <div className="space-y-3">
                        <p className="font-mono text-xs text-muted-foreground">
                          학습을 마쳤다면 완료 처리해 기록을 저장하세요.
                        </p>
                        <Button
                          onClick={handleComplete}
                          className="w-full md:w-auto font-mono text-sm bg-accent hover:bg-accent/90 text-foreground border border-accent/50"
                          size="lg"
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Complete Module
                        </Button>
                      </div>
                    ) : completedAt ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        Completed on{' '}
                        {mounted
                          ? new Date(completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : completedAt}
                      </p>
                    ) : (
                      <p className="font-mono text-xs text-muted-foreground">
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
              <div className="h-12 border-b border-border/30 flex items-center justify-between px-3 flex-shrink-0">
                <span className="font-mono text-sm font-medium text-foreground">
                  Cloud IDE
                </span>
                <div className="flex items-center gap-2">
                  {cloudIdePassword && (
                    <span className="font-mono text-xs text-muted-foreground">
                      Password:{' '}
                      <code className="bg-muted/50 px-1 rounded">
                        {cloudIdePassword}
                      </code>
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 font-mono text-xs"
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

          {/* Right panel - Attack Box (웹 버전, port8080) */}
          {attackBoxSplit && attackBoxWebUrl && (
            <div className="h-full min-h-0 flex-[0_0_50%] max-w-[50%] min-w-0 overflow-hidden flex flex-col bg-card">
              <div className="h-12 border-b border-border/30 flex items-center justify-between px-3 flex-shrink-0">
                <span className="font-mono text-sm font-medium text-foreground">
                  Attack Box
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 font-mono text-xs"
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
