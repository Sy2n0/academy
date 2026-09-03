import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { getLandingData } from '@/lib/landing';

import { V2Nav } from '@/components/landing/v2/V2Nav';
import { V2Hero } from '@/components/landing/v2/V2Hero';
import {
  V2Stats,
  V2Features,
  V2Tracks,
  V2Cta,
  V2Footer,
} from '@/components/landing/v2/V2Sections';

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

/**
 * Design comparison only — not linked from anywhere. This is the same content
 * and the same data as `/`, rendered with an accent colour, gradients, glow and
 * bold type, all of which the Warp sheet rules out. Delete this page and the
 * `.v2-theme` block once a direction is settled.
 */
const LandingV2: NextPageWithLayout<Props> = ({ data }: Props) => {
  return (
    <>
      <Head>
        <title>HUB ACADEMY — design preview</title>
        <meta name="robots" content="noindex" />
        <meta name="theme-color" content="#131311" />
      </Head>

      <div className="v2-theme min-h-svh bg-[var(--v2-bg)] text-[var(--v2-text)]">
        <V2Nav />
        <main>
          <V2Hero data={data} />
          <V2Stats data={data} />
          <V2Features data={data} />
          <V2Tracks data={data} />
          <V2Cta data={data} />
        </main>
        <V2Footer />
      </div>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;

  return {
    props: {
      data: await getLandingData(),
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

LandingV2.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default LandingV2;
