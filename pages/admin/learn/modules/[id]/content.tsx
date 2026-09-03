import { ExerciseEditor } from '@/components/admin/learn/ExerciseEditor';
import { type ReactElement, useState, useEffect } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
} from '@/components/admin/styles';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { Save, ArrowLeft, Eye, Edit } from 'lucide-react';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { extractCustomBlocks } from '@/lib/markdown-parser';
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
  content: string | null;
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

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!isAdmin(user.role)) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

const AdminModuleContentPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>(
    'split'
  );

  const { data, error, isLoading } = useSWR<{ data: Module }>(
    id ? `/api/admin/learn/modules/${id}` : null,
    fetcher
  );

  useEffect(() => {
    if (data?.data) {
      setContent(data.data.content || '');
    }
  }, [data]);

  // Markdown with custom components renderer
  const MarkdownWithComponents = ({
    content: markdownContent,
  }: {
    content: string;
  }) => {
    // 커스텀 블록을 직접 찾아서 처리
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // 모든 커스텀 블록 찾기
    const allMatches: Array<{
      type: string;
      start: number;
      end: number;
      props: any;
    }> = [];

    // URL 블록
    const urlPattern = /\[url:(https?:\/\/[^\]]+)\]/g;
    let match;
    while ((match = urlPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'url',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { url: match[1] },
      });
    }

    // Heap 블록
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

    // 코드 실행 블록
    const codeRunPattern = /\[run:(\w+)\]([\s\S]*?)\[\/run\]/g;
    while ((match = codeRunPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'code',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { code: match[2].trim(), language: match[1] },
      });
    }

    // 퀴즈 블록: [quiz:question|option1|option2|option3|answer_index]
    const quizPattern = /\[quiz:([^\]]+)\]/g;
    while ((match = quizPattern.exec(markdownContent)) !== null) {
      try {
        const parts = match[1].split('|');
        if (parts.length >= 3) {
          const question = parts[0];
          const answer = parseInt(parts[parts.length - 1]);
          const options = parts.slice(1, -1);
          allMatches.push({
            type: 'quiz',
            start: match.index!,
            end: match.index! + match[0].length,
            props: { question, options, answer },
          });
        }
      } catch {
        // ignore malformed embedded block
      }
    }

    // 터미널 블록: [terminal]...commands...[/terminal]
    const terminalPattern = /\[terminal\]([\s\S]*?)\[\/terminal\]/g;
    while ((match = terminalPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'terminal',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { commands: match[1].trim() },
      });
    }

    // JSON 포맷터 블록: [json:{"key":"value"}]
    const jsonPattern = /\[json:([^\]]+)\]/g;
    while ((match = jsonPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'json',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { data: match[1] },
      });
    }

    // 파일 다운로드 블록: [file:filename|content|mimetype]
    const filePattern = /\[file:([^\]]+)\]/g;
    while ((match = filePattern.exec(markdownContent)) !== null) {
      try {
        const parts = match[1].split('|');
        allMatches.push({
          type: 'file',
          start: match.index!,
          end: match.index! + match[0].length,
          props: {
            filename: parts[0] || 'file.txt',
            content: parts[1] || '',
            mimetype: parts[2] || 'text/plain',
          },
        });
      } catch {
        // ignore malformed embedded block
      }
    }

    // 체크리스트 블록: [checklist:item1|item2|item3]
    const checklistPattern = /\[checklist:([^\]]+)\]/g;
    while ((match = checklistPattern.exec(markdownContent)) !== null) {
      const items = match[1].split('|').filter(Boolean);
      allMatches.push({
        type: 'checklist',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { items },
      });
    }

    // API 테스트 블록: [api:endpoint|method|headers_json|body_json]
    const apiPattern = /\[api:([^\]]+)\]/g;
    while ((match = apiPattern.exec(markdownContent)) !== null) {
      try {
        const parts = match[1].split('|');
        allMatches.push({
          type: 'api',
          start: match.index!,
          end: match.index! + match[0].length,
          props: {
            endpoint: parts[0] || '',
            method: parts[1] || 'GET',
            headers: parts[2] ? JSON.parse(parts[2]) : {},
            body: parts[3] || '',
          },
        });
      } catch {
        // ignore malformed embedded block
      }
    }

    // 암호화/인코딩 블록: [crypto:type|data]
    const cryptoPattern = /\[crypto:([^\]]+)\]/g;
    while ((match = cryptoPattern.exec(markdownContent)) !== null) {
      try {
        const parts = match[1].split('|');
        allMatches.push({
          type: 'crypto',
          start: match.index!,
          end: match.index! + match[0].length,
          props: {
            type: parts[0] || 'base64',
            data: parts[1] || '',
          },
        });
      } catch {
        // ignore malformed embedded block
      }
    }

    // 헥스 덤프 블록: [hexdump:data]
    const hexdumpPattern = /\[hexdump:([^\]]+)\]/g;
    while ((match = hexdumpPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'hexdump',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { data: match[1] },
      });
    }

    // SQL Injection 테스트 블록: [sqli:query]
    const sqliPattern = /\[sqli:([^\]]+)\]/g;
    while ((match = sqliPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'sqli',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { query: match[1] },
      });
    }

    // XSS 테스트 블록: [xss:payload]
    const xssPattern = /\[xss:([^\]]+)\]/g;
    while ((match = xssPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'xss',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { payload: match[1] },
      });
    }

    // 포트 스캐너 블록: [portscan:target|ports]
    const portscanPattern = /\[portscan:([^\]]+)\]/g;
    while ((match = portscanPattern.exec(markdownContent)) !== null) {
      try {
        const parts = match[1].split('|');
        allMatches.push({
          type: 'portscan',
          start: match.index!,
          end: match.index! + match[0].length,
          props: {
            target: parts[0] || 'localhost',
            ports: parts[1] || '1-100',
          },
        });
      } catch {
        // ignore malformed embedded block
      }
    }

    // 로그 분석기 블록: [loganalyzer:logs]
    const loganalyzerPattern = /\[loganalyzer:([^\]]+)\]/g;
    while ((match = loganalyzerPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'loganalyzer',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { logs: match[1] },
      });
    }

    // 패킷 분석기 블록: [packet:data]
    const packetPattern = /\[packet:([^\]]+)\]/g;
    while ((match = packetPattern.exec(markdownContent)) !== null) {
      allMatches.push({
        type: 'packet',
        start: match.index!,
        end: match.index! + match[0].length,
        props: { packet: match[1] },
      });
    }

    // GUI vs CLI 비교 블록: [compare:title]GUI content[---]CLI content[/compare]
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

    // 인덱스 순으로 정렬
    allMatches.sort((a, b) => a.start - b.start);

    // 각 블록을 처리
    allMatches.forEach((item, index) => {
      // 블록 이전의 마크다운 렌더링
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

      // 커스텀 컴포넌트 렌더링
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

    // 마지막 부분 렌더링
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

    // 커스텀 블록이 없으면 일반 마크다운만 렌더링
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/learn/modules/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(
            error.error?.message || '모듈 콘텐츠 수정에 실패했습니다'
          );
        } else {
          throw new Error(
            `모듈 콘텐츠 수정에 실패했습니다: ${response.status} ${response.statusText}`
          );
        }
      }

      toast.success('Module content saved successfully');
    } catch (error: any) {
      toast.error(error.message || '모듈 콘텐츠 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-destructive">
          모듈을 불러오지 못했습니다
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Module Content - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Module content" description={data.data.title}>
        <div className="mb-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/learn/modules')}
            className={adminButtonClass}
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={adminButtonPrimaryClass}
          >
            <Save className="h-3 w-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('edit')}
            className="font-mono text-xs"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('preview')}
            className="font-mono text-xs"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant={viewMode === 'split' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('split')}
            className="font-mono text-xs"
          >
            <Edit className="h-4 w-4 mr-2" />
            <Eye className="h-4 w-4 mr-2" />
            Split
          </Button>
        </div>

        {/* Content Editor & Preview */}
        <div>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="content"
                className="font-mono text-sm font-bold text-foreground uppercase tracking-wider"
              >
                강의 내용 (Markdown 지원)
              </Label>
              <p className="font-mono text-xs text-muted-foreground mt-1 mb-4">
                Markdown 형식으로 강의 내용을 작성할 수 있습니다. 제목, 리스트,
                코드 블록 등을 사용할 수 있습니다.
              </p>
            </div>

            {/* Split View */}
            {viewMode === 'split' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground">
                    Editor
                  </Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="font-mono text-sm min-h-[700px] resize-none"
                    placeholder="# 강의 제목

## 섹션 1

강의 내용을 여기에 작성하세요. Markdown 형식을 지원합니다.

### 소제목

- 리스트 항목 1
- 리스트 항목 2

\`\`\`code
코드 블록 예시
\`\`\`

**굵은 글씨**와 *기울임*도 사용할 수 있습니다.

> 인용문 예시

[링크](https://example.com)
"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground">
                    Preview
                  </Label>
                  <div className="min-h-[700px] p-4 border border-border/30 rounded-md bg-background/40 overflow-y-auto prose prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground max-w-none">
                    <MarkdownWithComponents
                      content={
                        content ||
                        '*No content yet. Start typing to see the preview.*'
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Edit Only View */}
            {viewMode === 'edit' && (
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-sm min-h-[700px] resize-none"
                placeholder="# 강의 제목

## 섹션 1

강의 내용을 여기에 작성하세요. Markdown 형식을 지원합니다.

### 소제목

- 리스트 항목 1
- 리스트 항목 2

\`\`\`code
코드 블록 예시
\`\`\`

**굵은 글씨**와 *기울임*도 사용할 수 있습니다.

> 인용문 예시

[링크](https://example.com)
"
              />
            )}

            {/* Preview Only View */}
            {viewMode === 'preview' && (
              <div className="min-h-[700px] p-4 border border-border/30 rounded-md bg-background/40 overflow-y-auto prose prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground max-w-none">
                <MarkdownWithComponents
                  content={
                    content ||
                    '*No content yet. Switch to Edit mode to add content.*'
                  }
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border/30">
              <p className="font-mono text-xs text-muted-foreground">
                {content.length} characters
              </p>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className={adminButtonPrimaryClass}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Content'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sits under the content it grades, so an author writing a
                        실습 block can add its check without leaving the page. */}
        {typeof id === 'string' && (
          <section className="mt-10">
            <h2 className="mb-4 border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              실습 확인
            </h2>
            <ExerciseEditor moduleId={id} />
          </section>
        )}
      </AdminLayout>
    </>
  );
};

AdminModuleContentPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminModuleContentPage;
