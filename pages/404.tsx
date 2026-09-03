import React, { ReactElement } from 'react';
import Head from 'next/head';
import { ErrorPage } from '@/components/layouts/ErrorPage';

const Custom404 = () => (
  <>
    <Head>
      <title>Page not found - HUB ACADEMY</title>
    </Head>
    <ErrorPage
      code="404"
      title="Page not found"
      description="주소가 잘못되었거나 페이지가 이동했을 수 있습니다."
    />
  </>
);

export default Custom404;

// No layout: the error page draws its own full-viewport frame.
Custom404.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export async function getStaticProps() {
  return { props: {} };
}
