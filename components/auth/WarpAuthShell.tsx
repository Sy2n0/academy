/* eslint-disable i18next/no-literal-string */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatedNoise } from '@/components/animated-noise';

export interface AuthAsideStats {
  challengesLive: number;
  members: number;
  flagsCaptured: number;
}

/**
 * Shared canvas for every /auth page. The landing hands off to these screens, so
 * they run the same warm-dark theme, the same grid + grain, and the same
 * wordmark — clicking "Get started" should not feel like leaving the site.
 *
 * `aside` is the left-hand panel, shown from lg up. Pages that are a single
 * confirmation step (verify email, unlock account) omit it and centre instead.
 */
export function WarpAuthShell({
  children,
  aside,
  stats,
}: {
  children: ReactNode;
  aside?: { label: string; heading: string; body: string };
  stats?: AuthAsideStats | null;
}) {
  const split = Boolean(aside);

  return (
    <main className="relative min-h-svh bg-[var(--warp-void)] text-[var(--warp-parchment)]">
      <div
        className="warp-grid-bg pointer-events-none fixed inset-0 opacity-60"
        aria-hidden="true"
      />
      <AnimatedNoise opacity={0.025} />

      <div className="relative flex min-h-svh flex-col">
        <header className="warp-container flex h-[72px] shrink-0 items-center justify-between gap-6">
          <Link
            href="/"
            className="warp-nav-text whitespace-nowrap tracking-[-0.01em] text-[var(--warp-parchment)]"
          >
            HUB ACADEMY
          </Link>
          <Link href="/" className="warp-nav-text warp-link">
            ← Back to site
          </Link>
        </header>

        <div className="warp-container flex flex-1 items-center py-12 md:py-16">
          <div
            className={
              split
                ? 'grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-24'
                : 'w-full'
            }
          >
            {aside && (
              <div className="hidden lg:block">
                <p className="warp-label">{aside.label}</p>
                <h1 className="warp-heading mt-5 max-w-[14ch] text-balance">
                  {aside.heading}
                </h1>
                <p className="warp-body-lg mt-7 max-w-[42ch]">{aside.body}</p>

                {stats && (
                  <dl className="mt-12 grid max-w-[34rem] grid-cols-3 border-t border-[var(--warp-rule)]">
                    {[
                      { value: stats.challengesLive, label: 'Challenges live' },
                      { value: stats.flagsCaptured, label: 'Flags captured' },
                      { value: stats.members, label: 'Members' },
                    ].map(({ value, label }, i) => (
                      <div
                        key={label}
                        className={
                          i > 0
                            ? 'border-l border-[var(--warp-rule)] py-6 pl-6'
                            : 'py-6 pr-6'
                        }
                      >
                        <dd className="warp-mono text-[1.75rem] leading-none tabular-nums text-[var(--warp-parchment)]">
                          {value.toLocaleString()}
                        </dd>
                        <dt className="warp-label mt-3">{label}</dt>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}

            <div
              className={
                split
                  ? 'w-full lg:justify-self-end'
                  : 'mx-auto w-full max-w-[26rem]'
              }
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
