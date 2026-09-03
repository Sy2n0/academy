import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import env from '@/lib/env';
import { getLandingData } from '@/lib/landing';

import { WarpNav } from '@/components/landing/warp/WarpNav';
import { WarpSideNav } from '@/components/landing/warp/WarpSideNav';
import { WarpHero } from '@/components/landing/warp/WarpHero';
import { WarpStatsBand } from '@/components/landing/warp/WarpStatsBand';
import { WarpPlatform } from '@/components/landing/warp/WarpPlatform';
import { WarpCategories } from '@/components/landing/warp/WarpCategories';
import { WarpFooter } from '@/components/landing/warp/WarpFooter';

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

const Home: NextPageWithLayout<Props> = ({ data }: Props) => {
  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
        <meta
          name="description"
          content="백석대학교 HUB의 보안 학습 플랫폼 — 학습 모듈, CTF 챌린지, 격리된 실습 컨테이너, 랭킹."
        />
        <meta name="theme-color" content="#131311" />
      </Head>

      <div className="relative min-h-svh bg-[var(--warp-void)] text-[var(--warp-parchment)]">
        <div
          className="warp-grid-bg pointer-events-none fixed inset-0 opacity-60"
          aria-hidden="true"
        />

        <div className="relative">
          <WarpNav />
          <WarpSideNav />
          <main>
            <WarpHero
              challenges={data?.challenges ?? []}
              challengeCount={data?.stats.challengesLive ?? 0}
            />
            <WarpStatsBand stats={data?.stats ?? null} />
            <WarpPlatform data={data} />
            <WarpCategories stats={data?.categories ?? []} />
          </main>
          <WarpFooter />
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  // Redirect to login page if landing page is disabled
  if (env.hideLandingPage) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: true,
      },
    };
  }

  const { locale } = context;

  return {
    props: {
      data: await getLandingData(),
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

Home.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Home;
