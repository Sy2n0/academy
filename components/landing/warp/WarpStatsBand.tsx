import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface LandingStats {
  flagsCaptured: number;
  sandboxSolves: number;
  challengesLive: number;
  members: number;
}

const tiles: { key: keyof LandingStats; label: string }[] = [
  { key: 'flagsCaptured', label: 'Flags captured' },
  { key: 'sandboxSolves', label: 'Sandbox solves' },
  { key: 'challengesLive', label: 'Challenges live' },
  { key: 'members', label: 'Active members' },
];

function Counter({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }

    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: value,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => setShown(Math.round(counter.n)),
      onComplete: () => setShown(value),
    });

    return () => {
      tween.kill();
    };
  }, [value]);

  return <>{shown.toLocaleString()}</>;
}

export function WarpStatsBand({ stats }: { stats: LandingStats | null }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    // A full-bleed rule rather than a boxed widget — the numbers read as the
    // platform's scale, not as a card sitting on top of it.
    <section
      className="border-y border-[var(--warp-rule)] bg-[var(--warp-veil)]"
      aria-label="Platform activity"
    >
      <div ref={ref} className="warp-container">
        <dl className="grid grid-cols-2 md:grid-cols-4">
          {tiles.map(({ key, label }, i) => (
            <div
              key={key}
              className={[
                'py-7 md:py-8',
                i % 2 === 1 ? 'pl-6 md:pl-0' : '',
                i > 0 ? 'md:border-l md:border-[var(--warp-rule)] md:pl-8' : '',
                i < 2 ? 'border-b border-[var(--warp-rule)] md:border-b-0' : '',
                i % 2 === 0 && i < 3
                  ? 'border-r border-[var(--warp-rule)] md:border-r-0'
                  : '',
              ].join(' ')}
            >
              <dd className="warp-mono text-[clamp(2.25rem,3.6vw,3.25rem)] leading-none text-[var(--warp-parchment)] tabular-nums">
                {stats ? <Counter value={stats[key]} /> : '—'}
              </dd>
              <dt className="warp-label mt-4">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
