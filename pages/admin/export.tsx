import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { adminButtonClass } from '@/components/admin/styles';
import { downloadFile } from '@/lib/admin-ui';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  if (!isAdmin(user.role)) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

const EXPORTS = [
  {
    id: 'rankings',
    title: 'Rankings',
    description: '사용자별 점수, 순위, 점수 출처별 내역',
    endpoint: '/api/admin/rankings/export',
    filename: 'rankings',
    label: '랭킹',
  },
  {
    id: 'submissions',
    title: 'Submissions',
    description: '플래그 제출 기록 전체 — 시각, 점수, 성공 여부',
    endpoint: '/api/admin/submissions/export',
    filename: 'submissions',
    label: '제출',
  },
];

const Export: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>Export - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout
        title="Export"
        description="운영 데이터를 CSV로 내려받습니다"
      >
        <ul className="border-t border-[var(--warp-rule)]">
          {EXPORTS.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 border-b border-[var(--warp-rule)] py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    item.endpoint,
                    `${item.filename}-${new Date().toISOString()}.csv`,
                    (m) => toast.error(m),
                    (m) => toast.success(m)
                  )
                }
                className={adminButtonClass}
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
            </li>
          ))}
        </ul>
      </AdminLayout>
    </>
  );
};

Export.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Export;
