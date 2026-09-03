import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { type ReactElement, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { WarpAuthShell } from '@/components/auth/WarpAuthShell';
import { getAuthStats } from '@/lib/landing';
import type { NextPageWithLayout } from 'types';
import { authProviderEnabled } from '@/lib/auth';
import { JoinWithInvitation, Join } from '@/components/auth';
import Head from 'next/head';
import { Loading } from '@/components/shared';
import env from '@/lib/env';

const Signup: NextPageWithLayout<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ authProviders, recaptchaSiteKey, authStats }) => {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useTranslation('common');

  const { error, token } = router.query as {
    error: string;
    token: string;
  };

  useEffect(() => {
    if (error) {
      toast.error(t(error));
    }
  }, [error, t]);

  if (status === 'authenticated') {
    router.push(env.redirectIfAuthenticated);
  }

  const params = token ? `?token=${token}` : '';

  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>
      <WarpAuthShell
        stats={authStats}
        aside={{
          label: 'Create account',
          heading: 'Start with the first challenge',
          body: '학교 메일로 가입하면 학습 모듈과 활성 문제, 샌드박스 컨테이너가 바로 열립니다.',
        }}
      >
        <div className="space-y-6">
          {authProviders.credentials && (
            <>
              {token ? (
                <JoinWithInvitation
                  inviteToken={token}
                  recaptchaSiteKey={recaptchaSiteKey}
                />
              ) : (
                <Join recaptchaSiteKey={recaptchaSiteKey} />
              )}
            </>
          )}

          {/* The plain Join card ends with this prompt itself; the invitation
              form does not, so it is only rendered on that branch. */}
          {token && (
            <p className="text-center text-sm text-[var(--warp-stone)]">
              {t('already-have-an-account')}{' '}
              <Link
                href={`/auth/login${params}`}
                className="warp-link underline underline-offset-4 hover:text-[var(--warp-parchment)]"
              >
                {t('sign-in')}
              </Link>
            </p>
          )}
        </div>
      </WarpAuthShell>
    </>
  );
};

Signup.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      authProviders: authProviderEnabled(),
      recaptchaSiteKey: env.recaptcha.siteKey,
      authStats: await getAuthStats(),
    },
  };
};

export default Signup;
