import React, { ReactElement } from 'react';
import Head from 'next/head';
import { ErrorPage } from '@/components/layouts/ErrorPage';

const Custom500 = () => (
  <>
    <Head>
      <title>Server error - HUB ACADEMY</title>
    </Head>
    {/* The copy here used to be one sentence broken in half by the Go Back
        button — "We're unable to find out what's happening! We suggest you to"
        [button] "Try again later" — so it never finished either way. */}
    <ErrorPage
      code="500"
      title="Internal server error"
      description="서버에서 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
    />
  </>
);

export default Custom500;

Custom500.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export async function getStaticProps() {
  return { props: {} };
}
