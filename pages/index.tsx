import Link from 'next/link';
import { type ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { HeroSection } from '@/components/hero-section';
import { SignalsSection } from '@/components/signals-section';
import { WorkSection } from '@/components/work-section';
import { PrinciplesSection } from '@/components/principles-section';
import { ColophonSection } from '@/components/colophon-section';
import { SideNav } from '@/components/side-nav';
import { Navbar } from '@/components/landing/Navbar';
import env from '@/lib/env';
import Head from 'next/head';

const Home: NextPageWithLayout = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <main className="relative min-h-screen bg-background">
        <SideNav />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

        <div className="relative z-10">
          <HeroSection />
          {/* <SignalsSection /> */}
          <WorkSection />
          {/* <PrinciplesSection /> */}
          <ColophonSection />
        </div>
      </main>
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
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

Home.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Home;
