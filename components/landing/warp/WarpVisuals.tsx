/* eslint-disable i18next/no-literal-string */
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useInView, prefersReducedMotion } from './useInView';
import type {
  LandingChallenge,
  LandingModule,
  LandingRank,
} from '@/lib/landing';

/**
 * The product surfaces, drawn in the DOM rather than captured as screenshots —
 * they stay sharp at any density, follow the theme, and never go stale when the
 * app's UI moves. Content is real data from `getLandingData`.
 */

function Frame({
  label,
  meta,
  children,
  className,
  frameRef,
}: {
  label: string;
  meta?: string;
  children: ReactNode;
  className?: string;
  // Not named `ref`: this project is on React 18, where `ref` is reserved and
  // silently dropped on function components.
  frameRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={frameRef}
      className={cn(
        'overflow-hidden rounded-[12px] border border-[var(--warp-border)] bg-[var(--warp-surface)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--warp-rule)] px-5 py-3.5">
        <span className="warp-label">{label}</span>
        {meta && <span className="warp-label">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({
  children,
  last,
  className,
  style,
}: {
  children: ReactNode;
  last?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        'flex items-center gap-4 px-5 py-3.5',
        !last && 'border-b border-[var(--warp-rule)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ChallengeBoard({
  challenges,
}: {
  challenges: LandingChallenge[];
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);

  return (
    <Frame frameRef={ref} label="Playground" meta="Live season">
      <div className="flex items-center gap-4 border-b border-[var(--warp-rule)] bg-[var(--warp-veil)] px-5 py-2.5">
        <span className="warp-micro w-[5.5rem] shrink-0">Category</span>
        <span className="warp-micro flex-1">Challenge</span>
        <span className="warp-micro w-14 shrink-0 text-right">Points</span>
        <span className="w-4 shrink-0" />
      </div>

      {challenges.map(({ category, title, value, solved }, i) => (
        <Row
          key={`${category}-${title}`}
          last={i === challenges.length - 1}
          className={inView ? 'warp-rise' : 'opacity-0'}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span className="warp-mono w-[5.5rem] shrink-0 truncate text-[0.8125rem] text-[var(--warp-stone)]">
            {category}
          </span>
          <span
            className={cn(
              'flex-1 truncate text-[0.9375rem]',
              solved
                ? 'text-[var(--warp-stone)] line-through decoration-[var(--warp-stone)]/50'
                : 'text-[var(--warp-parchment)]'
            )}
          >
            {title}
          </span>
          <span className="warp-mono w-14 shrink-0 text-right text-[0.8125rem] tabular-nums text-[var(--warp-ash)]">
            {value}
          </span>
          <span
            className={cn(
              'warp-mono w-4 shrink-0 text-center text-[0.8125rem]',
              solved
                ? 'text-[var(--warp-parchment)]'
                : 'text-[var(--warp-stone)]'
            )}
            aria-label={solved ? 'solved' : 'unsolved'}
          >
            {solved ? '✓' : '·'}
          </span>
        </Row>
      ))}
    </Frame>
  );
}

export function SandboxTerminal({ solves }: { solves: number }) {
  const lines: { prompt?: boolean; text: string; dim?: boolean }[] = [
    { prompt: true, text: 'whoami' },
    { text: 'hub' },
    { prompt: true, text: 'ls -l /challenge' },
    { text: '-rw-r--r--  1 root root  38  flag.txt', dim: true },
    { prompt: true, text: 'cat /challenge/flag.txt' },
    { text: 'HUB{l1nux_3ss3nt14ls_cl34r3d}' },
  ];

  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const total = lines.reduce((n, line) => n + line.text.length, 0);
  const [typed, setTyped] = useState(0);

  // Types the transcript out once, character by character, when the block comes
  // into view. Commands run at a human pace; output arrives in one burst, the
  // way a real shell prints it.
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setTyped(total);
      return;
    }

    let cancelled = false;
    let count = 0;
    let cursor = 0;

    const step = () => {
      if (cancelled) return;
      const line = lines[cursor];
      if (!line) return;

      if (line.prompt) {
        count += 1;
        setTyped(count);
        if (count >= offsetThrough(lines, cursor)) cursor += 1;
        window.setTimeout(step, 26);
      } else {
        count = offsetThrough(lines, cursor);
        setTyped(count);
        cursor += 1;
        window.setTimeout(step, 260);
      }
    };

    const start = window.setTimeout(step, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, total]);

  let consumed = 0;

  return (
    <Frame frameRef={ref} label="Sandbox" meta="Linux essentials">
      <div className="warp-mono min-h-[13.5rem] px-5 py-5 text-[0.8125rem] leading-[1.9]">
        {lines.map((line, i) => {
          const before = consumed;
          consumed += line.text.length;
          const shown = Math.max(0, Math.min(line.text.length, typed - before));
          if (shown === 0) return null;

          const isTyping = shown < line.text.length;

          return (
            <div key={i} className="flex gap-2">
              {line.prompt && (
                <span className="select-none text-[var(--warp-stone)]">$</span>
              )}
              <span
                className={
                  line.dim || !line.prompt
                    ? 'text-[var(--warp-ash)]'
                    : 'text-[var(--warp-parchment)]'
                }
              >
                {line.text.slice(0, shown)}
                {isTyping && (
                  <span className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] bg-[var(--warp-parchment)]" />
                )}
              </span>
            </div>
          );
        })}

        {typed >= total && (
          <div className="flex gap-2">
            <span className="select-none text-[var(--warp-stone)]">$</span>
            <span className="warp-caret inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] bg-[var(--warp-parchment)]" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--warp-rule)] px-5 py-3">
        <span className="warp-label">Container ready</span>
        <span className="warp-label">
          {solves.toLocaleString()} solves recorded
        </span>
      </div>
    </Frame>
  );
}

/** Character count of every line up to and including `index`. */
function offsetThrough(lines: { text: string }[], index: number): number {
  let n = 0;
  for (let i = 0; i <= index; i += 1) n += lines[i].text.length;
  return n;
}

export function ModuleList({
  modules,
  total,
}: {
  modules: LandingModule[];
  total: number;
}) {
  return (
    <Frame label="Learn" meta={`${total} modules`}>
      {modules.map(({ title, tier, duration }, i) => (
        <Row key={title} last={i === modules.length - 1}>
          <span className="warp-mono w-14 shrink-0 text-[0.8125rem] text-[var(--warp-stone)]">
            {tier.replace(/^Tier\s*/i, 'T')}
          </span>
          <span className="flex-1 truncate text-[0.9375rem] text-[var(--warp-parchment)]">
            {title}
          </span>
          {duration && (
            <span className="warp-mono w-10 shrink-0 text-right text-[0.8125rem] tabular-nums text-[var(--warp-ash)]">
              {duration}
            </span>
          )}
        </Row>
      ))}
    </Frame>
  );
}

export function Leaderboard({ ranks }: { ranks: LandingRank[] }) {
  const top = ranks[0]?.points || 1;
  const { ref, inView } = useInView<HTMLDivElement>(0.4);

  return (
    <Frame frameRef={ref} label="Rankings" meta="All time">
      {ranks.map(({ name, points, solves }, i) => (
        <Row key={`${name}-${i}`} last={i === ranks.length - 1}>
          <span className="warp-mono w-6 shrink-0 text-[0.8125rem] tabular-nums text-[var(--warp-stone)]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="w-16 shrink-0 truncate text-[0.9375rem] text-[var(--warp-parchment)]">
            {name}
          </span>
          <span className="hidden h-1 flex-1 bg-[var(--warp-veil)] sm:block">
            <span
              className="block h-full bg-[var(--warp-ash)] transition-[width] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                width: inView ? `${Math.max((points / top) * 100, 4)}%` : '0%',
                transitionDelay: `${i * 90}ms`,
              }}
            />
          </span>
          <span className="warp-mono w-16 shrink-0 text-right text-[0.8125rem] tabular-nums text-[var(--warp-stone)]">
            {solves}
          </span>
          <span className="warp-mono w-16 shrink-0 text-right text-[0.8125rem] tabular-nums text-[var(--warp-ash)]">
            {points.toLocaleString()}
          </span>
        </Row>
      ))}
    </Frame>
  );
}
