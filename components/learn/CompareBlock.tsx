import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Monitor, Terminal, ArrowLeftRight, Copy, Check } from 'lucide-react';

type ViewMode = 'split' | 'gui' | 'cli';

// CLI 코드블록: 터미널 스타일 + 복사 버튼
const CliCodeBlock = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded-md overflow-hidden border border-green-900/40">
      {/* 터미널 상단바 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      {/* 코드 */}
      <pre className="bg-[#0d0d0d] px-4 py-3 overflow-x-auto m-0">
        <code className={`font-mono text-xs text-green-300 ${className || ''}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

// GUI 이미지: 브라우저/앱 프레임 스타일
const GuiImage = ({ src, alt }: { src?: string; alt?: string }) => (
  <div className="my-3 rounded-md overflow-hidden border border-border/40 shadow-md">
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 border-b border-border/30">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
      <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
      {alt && (
        <span className="ml-2 font-mono text-[10px] text-zinc-400 truncate">
          {alt}
        </span>
      )}
    </div>
    <div className="bg-zinc-900/40">
      <img
        src={src}
        alt={alt || ''}
        className="w-full h-auto object-contain max-h-[420px]"
      />
    </div>
  </div>
);

export const GuiCliCompare = ({
  title,
  guiContent,
  cliContent,
}: {
  title?: string;
  guiContent: string;
  cliContent: string;
}) => {
  const [mode, setMode] = useState<ViewMode>('split');

  const commonMd = {
    remarkPlugins: [remarkGfm] as any,
    rehypePlugins: [rehypeHighlight] as any,
  };

  const guiMdComponents = {
    img: ({ src, alt }: any) => <GuiImage src={src} alt={alt} />,
    code: ({ children, className }: any) => (
      <code
        className={`bg-background/60 px-1 py-0.5 rounded text-xs font-mono ${className || ''}`}
      >
        {children}
      </code>
    ),
    pre: ({ children }: any) => (
      <pre className="bg-background/60 border border-border/30 rounded-md px-4 py-3 overflow-x-auto text-xs font-mono my-2">
        {children}
      </pre>
    ),
  };

  const cliMdComponents = {
    // 코드블록(```)은 터미널 스타일로
    code: ({ children, className, ...props }: any) => {
      const isBlock = !props.inline;
      if (isBlock) {
        return <CliCodeBlock className={className}>{children}</CliCodeBlock>;
      }
      return (
        <code className="bg-green-900/30 text-green-300 px-1 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => <>{children}</>,
    // 일반 텍스트도 terminal feel
    p: ({ children }: any) => (
      <p className="font-mono text-xs text-zinc-300 leading-5 my-1">
        {children}
      </p>
    ),
  };

  const tabBtn = (val: ViewMode, label: string) => (
    <button
      onClick={() => setMode(val)}
      className={`px-2 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
        mode === val
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  const guiPane = (
    <div className="p-4 min-w-0">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
        <Monitor className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-blue-400 font-semibold">
          GUI
        </span>
      </div>
      <div className="prose dark:prose-invert prose-sm prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground max-w-none text-sm">
        <ReactMarkdown {...commonMd} components={guiMdComponents}>
          {guiContent.trim()}
        </ReactMarkdown>
      </div>
    </div>
  );

  const cliPane = (
    <div className="p-4 bg-[#0f0f0f]/60 min-w-0">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-900/40">
        <Terminal className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-green-400 font-semibold">
          CLI
        </span>
      </div>
      <ReactMarkdown {...commonMd} components={cliMdComponents}>
        {cliContent.trim()}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="my-5 border border-border/30 rounded-lg overflow-hidden bg-background/40 not-prose">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-background/60 border-b border-border/30">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-xs uppercase tracking-wider text-foreground">
            {title || 'GUI vs CLI'}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-background/40 border border-border/30 rounded-md p-0.5">
          {tabBtn('split', '⊟ Split')}
          {tabBtn('gui', 'GUI')}
          {tabBtn('cli', 'CLI')}
        </div>
      </div>

      {/* Body */}
      {mode === 'split' ? (
        <div className="grid grid-cols-2 divide-x divide-border/30">
          {guiPane}
          {cliPane}
        </div>
      ) : mode === 'gui' ? (
        guiPane
      ) : (
        cliPane
      )}
    </div>
  );
};
