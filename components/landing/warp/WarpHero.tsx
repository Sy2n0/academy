/* eslint-disable i18next/no-literal-string */
import Link from 'next/link';
import { AnimatedNoise } from '@/components/animated-noise';
import { BitmapChevron } from '@/components/bitmap-chevron';
import { ScrambleTextOnHover } from '@/components/scramble-text';
import { ChallengeBoard } from './WarpVisuals';
import type { LandingChallenge } from '@/lib/landing';

export function WarpHero({
  challenges,
  challengeCount,
}: {
  challenges: LandingChallenge[];
  challengeCount: number;
}) {
  return (
    <section
      id="hero"
      className="relative flex min-h-svh flex-col justify-center pb-16 pt-[calc(72px+3.5rem)]"
    >
      <AnimatedNoise opacity={0.025} />

      <div className="warp-container relative">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
          <div>
            <p className="warp-label">
              Baekseok University · Highest Unique Batch
            </p>

            {/* NEW COPY — the previous landing had only a slogan. A visitor has
                to learn what this platform does before anything else works. */}
            <h1 className="warp-display mt-6 max-w-[15ch]">
              Learn security by breaking things
            </h1>

            <p className="warp-body-lg mt-6 max-w-[48ch]">
              백석대학교 HUB의 학습 플랫폼입니다. 학습 모듈, CTF 챌린지, 격리된
              실습 컨테이너, 랭킹까지 한곳에서 굴러갑니다.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/auth/join" className="warp-pill group">
                <ScrambleTextOnHover
                  text="Get started"
                  as="span"
                  duration={0.5}
                />
                <BitmapChevron className="h-3.5 w-3.5 transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
              </Link>
              <a href="#platform" className="warp-ghost">
                See the platform
              </a>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <ChallengeBoard challenges={challenges} />
            <p className="warp-micro mt-4 text-right">
              {challengeCount} challenges live across six disciplines
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
