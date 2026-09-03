import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { MachineTabs } from '@/components/admin/machines/MachineTabs';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!isAdmin(user.role)) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

const MachineManage: NextPageWithLayout = () => {
  // gameId는 기본값으로 '1'을 사용하거나 실제 게임 ID를 가져와야 함
  const gameId = '1';

  return (
    <>
      <Head>
        <title>Machine Manage - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Machine manage" description="머신 정보와 라이트업">
        <MachineTabs gameId={gameId} />
      </AdminLayout>
    </>
  );
};

MachineManage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default MachineManage;
