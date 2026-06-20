import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ExternalLink, Play } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// URL 프리뷰 컴포넌트
export const UrlPreview = ({ url }: { url: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [iframeUrl, setIframeUrl] = useState(url);
  const [showHeaders, setShowHeaders] = useState(false);
  const [requestHeaders, setRequestHeaders] = useState<Record<string, string>>(
    {}
  );
  const [responseHeaders, setResponseHeaders] = useState<
    Record<string, string>
  >({});
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'preview' | 'headers' | 'response'
  >('preview');

  const fetchUrl = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseHeaders({});
    setResponseBody('');

    try {
      // Request 헤더 설정
      const headers: Record<string, string> = {
        'User-Agent': navigator.userAgent,
        Accept: '*/*',
        'Accept-Language': navigator.language,
      };
      setRequestHeaders(headers);

      // 서버 사이드 프록시를 통해 요청 (CORS 문제 해결)
      const response = await fetch('/api/proxy-fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setResponseStatus(data.status || 200);
      setResponseHeaders(data.responseHeaders || {});
      setResponseBody(data.body || '(No response body)');
    } catch (error: any) {
      // CORS 에러인지 확인
      const isCorsError =
        error.message.includes('CORS') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError');

      setResponseStatus(0);
      setResponseHeaders({
        error: isCorsError
          ? 'CORS Error: 브라우저에서 직접 요청할 수 없습니다. 서버 프록시를 사용하세요.'
          : error.message,
      });
      setResponseBody(
        isCorsError
          ? 'CORS 정책으로 인해 브라우저에서 직접 이 URL을 요청할 수 없습니다. 서버 사이드 프록시 API를 사용하거나 다른 방법을 시도해주세요.'
          : error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg overflow-hidden bg-background/40">
      <div className="flex items-center justify-between p-3 bg-background/60 border-b border-border/30">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs text-foreground">{url}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUrl}
            disabled={isLoading}
            className="font-mono text-xs h-7"
          >
            {isLoading ? 'Loading...' : 'Fetch'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="font-mono text-xs h-7"
          >
            <Play className="h-3 w-3 mr-1" />
            Open
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(url, '_blank')}
            className="font-mono text-xs h-7"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Request/Response 정보 표시 */}
      {(responseStatus !== null || showHeaders) && (
        <div className="p-3 bg-background/40 border-b border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant={activeTab === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('preview')}
              className="font-mono text-xs h-7"
            >
              Preview
            </Button>
            <Button
              variant={activeTab === 'headers' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('headers')}
              className="font-mono text-xs h-7"
            >
              Headers
            </Button>
            <Button
              variant={activeTab === 'response' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('response')}
              className="font-mono text-xs h-7"
            >
              Response
            </Button>
          </div>

          {activeTab === 'headers' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-mono text-xs font-semibold text-foreground mb-2">
                  Request Headers
                </h4>
                <div className="bg-background/60 rounded p-2 max-h-40 overflow-y-auto">
                  <pre className="font-mono text-xs text-foreground">
                    {Object.entries(requestHeaders).map(([key, value]) => (
                      <div key={key} className="mb-1">
                        <span className="text-accent">{key}:</span> {value}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
              <div>
                <h4 className="font-mono text-xs font-semibold text-foreground mb-2">
                  Response Headers
                </h4>
                <div className="bg-background/60 rounded p-2 max-h-40 overflow-y-auto">
                  <pre className="font-mono text-xs text-foreground">
                    {responseStatus && (
                      <div className="mb-2 pb-2 border-b border-border/30">
                        <span className="text-accent">Status:</span>{' '}
                        {responseStatus}{' '}
                        {responseStatus >= 200 && responseStatus < 300
                          ? '✓'
                          : '✗'}
                      </div>
                    )}
                    {Object.entries(responseHeaders).map(([key, value]) => (
                      <div key={key} className="mb-1">
                        <span className="text-accent">{key}:</span> {value}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'response' && (
            <div>
              <h4 className="font-mono text-xs font-semibold text-foreground mb-2">
                Response Body
              </h4>
              <div className="bg-background/60 rounded p-2 max-h-60 overflow-y-auto">
                <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-words">
                  {responseBody || '(No response body)'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="text-center py-4">
              <p className="font-mono text-xs text-muted-foreground">
                Click &quot;Open&quot; to view in iframe
              </p>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-6xl h-[80vh]">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">{url}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={iframeUrl}
                className="w-full h-full border border-border/30 rounded"
                title="URL Preview"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Heap 시각화 컴포넌트 (간단한 예시)
export const HeapVisualizer = ({ data }: { data?: string }) => {
  const [nodes, setNodes] = useState<Array<{ id: number; value: number }>>(
    data
      ? JSON.parse(data)
      : [
          { id: 1, value: 10 },
          { id: 2, value: 20 },
          { id: 3, value: 30 },
        ]
  );

  const addNode = () => {
    const newId = nodes.length + 1;
    const newValue = Math.floor(Math.random() * 100);
    setNodes([...nodes, { id: newId, value: newValue }]);
  };

  const removeNode = (id: number) => {
    setNodes(nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-sm font-semibold text-foreground">
          Heap Visualizer
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addNode}
          className="font-mono text-xs"
        >
          Add Node
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center gap-2 p-2 border border-border/30 rounded bg-background/60"
          >
            <span className="font-mono text-xs text-foreground">
              {node.value}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeNode(node.id)}
              className="h-5 w-5 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// 코드 실행 컴포넌트
export const CodeRunner = ({
  code,
  language,
}: {
  code: string;
  language?: string;
}) => {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');
    setExecutionTime(null);

    const startTime = Date.now();

    try {
      const lang = (language || 'javascript').toLowerCase();

      // JavaScript는 클라이언트에서 실행
      if (lang === 'javascript' || lang === 'js') {
        const logs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        // console.log, console.error, console.warn을 오버라이드
        console.log = (...args: any[]) => {
          logs.push(
            args
              .map((arg) =>
                typeof arg === 'object'
                  ? JSON.stringify(arg, null, 2)
                  : String(arg)
              )
              .join(' ')
          );
          originalLog.apply(console, args);
        };

        console.error = (...args: any[]) => {
          logs.push(
            'ERROR: ' +
              args
                .map((arg) =>
                  typeof arg === 'object'
                    ? JSON.stringify(arg, null, 2)
                    : String(arg)
                )
                .join(' ')
          );
          originalError.apply(console, args);
        };

        console.warn = (...args: any[]) => {
          logs.push(
            'WARN: ' +
              args
                .map((arg) =>
                  typeof arg === 'object'
                    ? JSON.stringify(arg, null, 2)
                    : String(arg)
                )
                .join(' ')
          );
          originalWarn.apply(console, args);
        };

        try {
          // 코드 실행 (안전한 방식으로)
          const func = new Function(code);
          const result = func();

          // 반환값이 있으면 출력에 추가
          if (result !== undefined) {
            logs.push(String(result));
          }

          setOutput(logs.join('\n') || '(No output)');
        } catch (e: any) {
          setError(e.message || 'Execution error');
        } finally {
          // console 복원
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
        }
      } else {
        // 다른 언어는 서버에서 실행
        const response = await fetch('/api/run-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, language: lang }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to execute code');
        }

        setOutput(data.output || '(No output)');
        if (data.error) {
          setError(data.error);
        }
      }

      const endTime = Date.now();
      setExecutionTime(endTime - startTime);
    } catch (e: any) {
      setError(e.message || 'Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg overflow-hidden bg-background/40">
      <div className="p-3 bg-background/60 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {language || 'code'}
          </span>
          {executionTime !== null && (
            <span className="font-mono text-xs text-muted-foreground">
              ({executionTime}ms)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runCode}
          disabled={isRunning}
          className="font-mono text-xs"
        >
          {isRunning ? 'Running...' : 'Run Code'}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto bg-background/60">
        <code className="font-mono text-sm text-foreground">{code}</code>
      </pre>
      {(output || error) && (
        <div className="p-3 border-t border-border/30 bg-background/60">
          {error && (
            <div className="mb-2">
              <p className="font-mono text-xs text-destructive font-semibold mb-1">
                Error:
              </p>
              <pre className="font-mono text-xs text-destructive whitespace-pre-wrap break-words">
                {error}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <p className="font-mono text-xs text-foreground font-semibold mb-1">
                Output:
              </p>
              <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-words">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
