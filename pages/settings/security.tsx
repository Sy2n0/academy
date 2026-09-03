import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { type ReactElement } from 'react';
import Head from 'next/head';
import type { NextPageWithLayout } from 'types';

import env from '@/lib/env';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { UpdatePassword } from '@/components/account';
import ManageSessions from '@/components/account/ManageSessions';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';

type SecurityProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Security: NextPageWithLayout<SecurityProps> = ({
  sessionStrategy,
  security,
}) => {
  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <SettingsLayout
        title="Security"
        description="계정 상태와 비밀번호, 로그인 세션을 관리합니다."
      >
        {/* Status moved here from the Account page: whether an email is
            verified and whether an account is locked are security facts, and
            Account opened on them before it showed who you were. */}
        <div className="border-b border-[var(--warp-rule)] pb-8">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Status
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Email verification
              </dt>
              <dd
                className={`text-sm ${
                  security.emailVerified
                    ? 'text-foreground'
                    : 'text-destructive'
                }`}
              >
                {security.emailVerified ? 'Verified' : 'Not verified'}
              </dd>
              {security.emailVerified && (
                <dd className="warp-num mt-1 text-xs text-muted-foreground">
                  {new Date(security.emailVerified).toLocaleDateString(
                    'en-US',
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )}
                </dd>
              )}
            </div>

            <div>
              <dt className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Account status
              </dt>
              <dd
                className={`text-sm ${
                  security.locked ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {security.locked ? 'Locked' : 'Active'}
              </dd>
              {security.invalidLoginAttempts > 0 && (
                <dd className="mt-1 text-xs text-muted-foreground">
                  <span className="warp-num">
                    {security.invalidLoginAttempts}
                  </span>{' '}
                  failed login attempt
                  {security.invalidLoginAttempts > 1 ? 's' : ''}
                </dd>
              )}
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-8 pt-8">
          <UpdatePassword />
          {sessionStrategy === 'database' && <ManageSessions />}
        </div>
      </SettingsLayout>
    </>
  );
};

Security.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const { sessionStrategy } = env.nextAuth;

  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);

  if (!user) {
    return { notFound: true };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      sessionStrategy,
      security: {
        emailVerified: user.emailVerified
          ? user.emailVerified.toISOString()
          : null,
        locked: !!user.lockedAt,
        invalidLoginAttempts: user.invalidLoginAttempts ?? 0,
      },
    },
  };
};

export default Security;
