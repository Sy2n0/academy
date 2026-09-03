/* eslint-disable i18next/no-literal-string */
import Link from 'next/link';
import { ArrowRight, Check, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LandingChallenge, LandingData } from '@/lib/landing';

function Board({ challenges }: { challenges: LandingChallenge[] }) {
  return (
    <div className="v2-card p-1.5">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-[0.8125rem] font-semibold">
          <Terminal className="h-3.5 w-3.5 text-[var(--v2-accent)]" />
          Playground
        </span>
        <span className="v2-chip">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-accent)]" />
          Live season
        </span>
      </div>

      <div className="rounded-[0.75rem] border border-[var(--v2-line)] bg-[var(--v2-bg)]/60">
        {challenges.map(({ category, title, value, solved }, i) => (
          <div
            key={`${category}-${title}`}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2.5',
              i !== challenges.length - 1 && 'border-b border-[var(--v2-line)]'
            )}
          >
            <span className="v2-mono w-[4.5rem] shrink-0 truncate text-[0.75rem] text-[var(--v2-dim)]">
              {category}
            </span>
            <span
              className={cn(
                'flex-1 truncate text-[0.875rem] font-medium',
                solved ? 'text-[var(--v2-dim)]' : 'text-[var(--v2-text)]'
              )}
            >
              {title}
            </span>
            <span className="v2-mono shrink-0 text-[0.75rem] text-[var(--v2-muted)]">
              {value}
            </span>
            {solved ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--v2-accent)]" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function V2Hero({ data }: { data: LandingData | null }) {
  return (
    <section className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="v2-grid-bg pointer-events-none absolute inset-0" />
      <div
        className="v2-glow left-1/2 top-[-14rem] h-[30rem] w-[46rem] -translate-x-1/2"
        style={{ background: 'var(--v2-accent)', opacity: 0.09 }}
      />
      <div
        className="v2-glow right-[-8rem] top-[8rem] h-[24rem] w-[24rem]"
        style={{ background: 'var(--v2-accent-2)', opacity: 0.14 }}
      />

      <div className="v2-container relative">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
          <div>
            <span className="v2-chip">백석대학교 · Highest Unique Batch</span>

            <h1 className="v2-display mt-6 max-w-[14ch]">
              <span className="v2-gradient-text">
                Learn security by breaking things
              </span>
            </h1>

            <p className="v2-lead mt-6 max-w-[46ch]">
              학습 모듈부터 CTF 챌린지, 브라우저에서 바로 뜨는 실습 컨테이너,
              랭킹까지. HUB의 모든 학습이 한곳에서 굴러갑니다.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/auth/join" className="v2-btn">
                무료로 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#platform" className="v2-btn-ghost">
                플랫폼 둘러보기
              </a>
            </div>

            <p className="v2-body mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem]">
              {[
                `${data?.stats.challengesLive ?? 0}개 활성 문제`,
                `${data?.moduleCount ?? 0}개 학습 모듈`,
                '설치 불필요',
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--v2-accent)]" />
                  {item}
                </span>
              ))}
            </p>
          </div>

          <div className="lg:justify-self-end lg:pl-4">
            <Board challenges={data?.challenges ?? []} />
          </div>
        </div>
      </div>
    </section>
  );
}
