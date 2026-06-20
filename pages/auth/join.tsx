import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { type ReactElement, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Navbar } from '@/components/landing/Navbar';
import { AnimatedNoise } from '@/components/animated-noise';
import type { NextPageWithLayout } from 'types';
import { authProviderEnabled } from '@/lib/auth';
import { JoinWithInvitation, Join } from '@/components/auth';
import Head from 'next/head';
import { Loading } from '@/components/shared';
import env from '@/lib/env';

const Signup: NextPageWithLayout<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ authProviders, recaptchaSiteKey }) => {
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
      <main className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

        <div className="relative z-10">
          <div className="w-full pt-4">
            <Navbar hideAuthButtons />
          </div>

          <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12 md:px-12">
            <div className="w-full max-w-md space-y-6">
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

              <p className="text-center text-sm text-muted-foreground">
                {t('already-have-an-account')}{' '}
                <Link
                  href={`/auth/login/${params}`}
                  className="font-medium text-foreground hover:text-accent transition-colors underline underline-offset-4"
                >
                  {t('sign-in')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
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
    },
  };
};

export default Signup;
