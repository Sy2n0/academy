/* eslint-disable i18next/no-literal-string */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Download, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { useToolPanel } from '@/components/learn/ToolPanelContext';

// 퀴즈 블록 (객관식)
export const QuizBlock = ({
  question,
  options,
  answer,
}: {
  question: string;
  options: string[];
  answer: number;
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = () => {
    setShowResult(true);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
        {question}
      </h3>
      <div className="space-y-2 mb-4">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => !showResult && setSelected(index)}
            className={`w-full text-left p-3 rounded border transition-colors font-mono text-xs ${
              showResult
                ? index === answer
                  ? 'bg-green-500/20 border-green-500'
                  : selected === index && index !== answer
                    ? 'bg-red-500/20 border-red-500'
                    : 'bg-background/60 border-border/30'
                : selected === index
                  ? 'bg-accent border-accent/50'
                  : 'bg-background/60 border-border/30 hover:bg-background/80'
            }`}
          >
            {index + 1}. {option}
            {showResult && index === answer && (
              <Check className="h-4 w-4 inline ml-2 text-green-500" />
            )}
            {showResult && selected === index && index !== answer && (
              <X className="h-4 w-4 inline ml-2 text-red-500" />
            )}
          </button>
        ))}
      </div>
      {!showResult ? (
        <Button
          onClick={handleSubmit}
          disabled={selected === null}
          className="font-mono text-xs"
        >
          Submit Answer
        </Button>
      ) : (
        <div className="font-mono text-xs">
          {selected === answer ? (
            <span className="text-green-500">✓ Correct!</span>
          ) : (
            <span className="text-red-500">
              ✗ Wrong. Correct answer is option {answer + 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// 터미널/쉘 블록
export const TerminalBlock = ({ commands }: { commands?: string }) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showRealTerminal, setShowRealTerminal] = useState(false);
  const [terminalInfo, setTerminalInfo] = useState<{
    sessionId: string;
    port: number;
    containerName: string;
  } | null>(null);
  const [loadingTerminal, setLoadingTerminal] = useState(false);

  const runCommand = async () => {
    if (!command.trim()) return;
    setIsRunning(true);
    try {
      const response = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: command, language: 'bash' }),
      });
      const data = await response.json();
      const newLines = [`$ ${command}`];
      if (data.output && data.output !== '(No output)') {
        newLines.push(data.output.trim());
      }
      if (data.error) {
        newLines.push(`Error: ${data.error}`);
      }
      setOutput([...output, ...newLines]);
    } catch (error: any) {
      setOutput([...output, `$ ${command}`, `Error: ${error.message}`]);
    } finally {
      setIsRunning(false);
      setCommand('');
    }
  };

  const toolPanel = useToolPanel();

  const onOpenRealTerminal = async () => {
    setLoadingTerminal(true);
    try {
      const res = await fetch('/api/launch-terminal', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '터미널 생성 실패');
        return;
      }

      const url = `${window.location.protocol}//${data.host}:${data.port}/`;
      setTerminalInfo(data);
      setShowRealTerminal(true);

      const stop = async () => {
        await fetch('/api/kill-terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId: data.sessionId }),
        }).catch(() => {});
        setShowRealTerminal(false);
        setTerminalInfo(null);
      };

      // On a module page the session opens in the split panel, beside the
      // lecture — the same place Attack Box and Cloud IDE appear. Elsewhere
      // (tracks, previews) there is no panel, so fall back to a new tab.
      if (toolPanel) {
        toolPanel.open({ title: 'Terminal', url, onClose: stop });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      toast.error(e.message || '터미널 생성 실패');
    } finally {
      setLoadingTerminal(false);
    }
  };

  const onCloseRealTerminal = async () => {
    if (terminalInfo) {
      try {
        await fetch('/api/kill-terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId: terminalInfo.sessionId }),
        });
      } catch {
        // intentionally ignored
      }
    }
    toolPanel?.close();
    setShowRealTerminal(false);
    setTerminalInfo(null);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg overflow-hidden bg-background/40">
      <div className="p-3 bg-background/60 border-b border-border/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-sm font-semibold text-foreground">
            Terminal
          </h3>
          {!showRealTerminal && (
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={onOpenRealTerminal}
              disabled={loadingTerminal}
            >
              {loadingTerminal ? '로딩 중...' : '실제 터미널 열기'}
            </Button>
          )}
          {showRealTerminal && (
            <Button
              variant="destructive"
              size="sm"
              className="font-mono text-xs"
              onClick={onCloseRealTerminal}
            >
              터미널 종료
            </Button>
          )}
        </div>
        {!showRealTerminal && (
          <div className="flex gap-2">
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && runCommand()}
              placeholder="Enter command..."
              className="font-mono text-xs flex-1"
            />
            <Button
              onClick={runCommand}
              disabled={isRunning || !command.trim()}
              size="sm"
              className="font-mono text-xs"
            >
              <Play className="h-3 w-3" />
            </Button>
          </div>
        )}
        {showRealTerminal && terminalInfo && (
          <p className="mt-2 text-xs text-muted-foreground">
            {toolPanel
              ? '터미널이 오른쪽 패널에서 실행 중입니다.'
              : '터미널이 새 탭에서 실행 중입니다.'}
          </p>
        )}
      </div>
      <div className="p-3 bg-black/80 font-mono text-xs min-h-[200px] max-h-[400px] overflow-y-auto">
        {output.length === 0 && commands && (
          <div className="text-muted-foreground">
            {commands.split('\n').map((cmd, i) => (
              <div key={i} className="text-blue-400">
                $ {cmd}
              </div>
            ))}
          </div>
        )}
        {output.map((line, i) => {
          if (line.startsWith('$')) {
            return (
              <div key={i} className="text-blue-400">
                {line}
              </div>
            );
          } else if (line.startsWith('Error:')) {
            return (
              <div key={i} className="text-red-400">
                {line}
              </div>
            );
          } else {
            return (
              <div key={i} className="text-green-400">
                {line}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

// JSON/YAML 포맷터
export const JsonFormatter = ({ data }: { data?: string }) => {
  const [input, setInput] = useState(data || '');
  const [formatted, setFormatted] = useState('');
  const [error, setError] = useState('');

  const formatJson = () => {
    try {
      const parsed = JSON.parse(input);
      setFormatted(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e: any) {
      setError(e.message);
      setFormatted('');
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setFormatted(JSON.stringify(parsed));
      setError('');
    } catch (e: any) {
      setError(e.message);
      setFormatted('');
    }
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">
          JSON Formatter
        </h3>
        <div className="flex gap-2">
          <Button onClick={formatJson} size="sm" className="font-mono text-xs">
            Format
          </Button>
          <Button
            onClick={minifyJson}
            size="sm"
            variant="outline"
            className="font-mono text-xs"
          >
            Minify
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">
            Input
          </label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
            placeholder='{"key": "value"}'
          />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">
            Output
          </label>
          <Textarea
            value={formatted}
            readOnly
            className="font-mono text-xs min-h-[200px] bg-background/60"
            placeholder="Formatted JSON will appear here"
          />
        </div>
      </div>
      {error && (
        <div className="mt-2 font-mono text-xs text-destructive">{error}</div>
      )}
    </div>
  );
};

// 파일 다운로드 블록
export const FileDownloadBlock = ({
  filename,
  content,
  mimetype,
}: {
  filename: string;
  content: string;
  mimetype?: string;
}) => {
  const handleDownload = () => {
    const blob = new Blob([content], { type: mimetype || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono text-sm font-semibold text-foreground">
            {filename}
          </h3>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            {content.length} bytes
          </p>
        </div>
        <Button onClick={handleDownload} className="font-mono text-xs">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
      <div className="mt-3 p-3 bg-background/60 rounded border border-border/30 max-h-40 overflow-y-auto">
        <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    </div>
  );
};

// 체크리스트 블록
export const ChecklistBlock = ({ items }: { items: string[] }) => {
  const [checked, setChecked] = useState<boolean[]>(
    new Array(items.length).fill(false)
  );

  const toggleCheck = (index: number) => {
    const newChecked = [...checked];
    newChecked[index] = !newChecked[index];
    setChecked(newChecked);
  };

  const progress = (checked.filter(Boolean).length / items.length) * 100;

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">
          Checklist
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          {checked.filter(Boolean).length} / {items.length}
        </span>
      </div>
      <div className="mb-3 h-2 bg-background/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <label
            key={index}
            className="flex items-center gap-2 p-2 rounded hover:bg-background/60 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked[index]}
              onChange={() => toggleCheck(index)}
              className="w-4 h-4"
            />
            <span
              className={`font-mono text-xs ${checked[index] ? 'line-through text-muted-foreground' : 'text-foreground'}`}
            >
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

// API 테스트 블록
export const ApiTestBlock = ({
  endpoint,
  method,
  headers,
  body,
}: {
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) => {
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testApi = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: method || 'GET',
        headers: headers || {},
        body: body ? JSON.stringify(JSON.parse(body)) : undefined,
      });

      const data = await res.text();
      try {
        setResponse({
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          body: JSON.parse(data),
        });
      } catch {
        setResponse({
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          body: data,
        });
      }
    } catch (error: any) {
      setResponse({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">
          API Test
        </h3>
        <Button
          onClick={testApi}
          disabled={isLoading}
          size="sm"
          className="font-mono text-xs"
        >
          {isLoading ? 'Testing...' : 'Test API'}
        </Button>
      </div>
      <div className="space-y-2 mb-3">
        <div>
          <span className="font-mono text-xs text-muted-foreground">
            Method:{' '}
          </span>
          <span className="font-mono text-xs text-foreground">
            {method || 'GET'}
          </span>
        </div>
        <div>
          <span className="font-mono text-xs text-muted-foreground">
            Endpoint:{' '}
          </span>
          <span className="font-mono text-xs text-foreground">{endpoint}</span>
        </div>
      </div>
      {response && (
        <div className="mt-3 p-3 bg-background/60 rounded border border-border/30">
          <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
