import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';

import * as Yup from 'yup';
import Link from 'next/link';
import { useFormik } from 'formik';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import React, { type ReactElement, useEffect, useState, useRef } from 'react';
import { getCsrfToken, signIn, useSession } from 'next-auth/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

import env from '@/lib/env';
import type { NextPageWithLayout } from 'types';
import GithubButton from '@/components/auth/GithubButton';
import GoogleButton from '@/components/auth/GoogleButton';
import { authProviderEnabled } from '@/lib/auth';
import Head from 'next/head';
import { Loading } from '@/components/shared';
import { maxLengthPolicies } from '@/lib/common';
import GoogleReCAPTCHA from '@/components/shared/GoogleReCAPTCHA';
import ReCAPTCHA from 'react-google-recaptcha';
import { WarpAuthShell } from '@/components/auth/WarpAuthShell';
import { getAuthStats } from '@/lib/landing';

interface Message {
  text: string | null;
  status: 'error' | 'success' | null;
}

const Login: NextPageWithLayout<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ csrfToken, authProviders, recaptchaSiteKey, authStats }) => {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useTranslation('common');
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const [message, setMessage] = useState<Message>({ text: null, status: null });
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // csrfToken이 null이면 undefined로 변환
  const csrfTokenValue = csrfToken || undefined;

  const { error, success, token } = router.query as {
    error: string;
    success: string;
    token: string;
  };

  useEffect(() => {
    if (error) {
      setMessage({ text: error, status: 'error' });
      toast.error(t(error));
    }

    if (success) {
      setMessage({ text: success, status: 'success' });
      toast.success(t(success));
    }
  }, [error, success, t]);

  const redirectUrl = token
    ? `/invitations/${token}`
    : env.redirectIfAuthenticated;

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object().shape({
      email: Yup.string().required().email().max(maxLengthPolicies.email),
      password: Yup.string().required().max(maxLengthPolicies.password),
    }),
    onSubmit: async (values) => {
      const { email, password } = values;

      setMessage({ text: null, status: null });

      const response = await signIn('credentials', {
        email,
        password,
        csrfToken: csrfTokenValue,
        redirect: false,
        callbackUrl: redirectUrl,
        recaptchaToken,
      });

      formik.resetForm();
      recaptchaRef.current?.reset();

      if (response && !response.ok) {
        setMessage({ text: response.error, status: 'error' });
        toast.error(t(response.error) || response.error);
        return;
      }

      if (response?.ok) {
        toast.success(t('successfully-logged-in') || 'Successfully logged in');
        // 세션 업데이트를 기다린 후 리다이렉트
        setTimeout(() => {
          router.push(redirectUrl).catch(() => {
            // router.push 실패 시 window.location 사용
            window.location.href = redirectUrl;
          });
        }, 500);
      }
    },
  });

  if (status === 'authenticated') {
    router.push(redirectUrl);
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
          label: 'Welcome back',
          heading: 'Pick up where you left off',
          body: '진행 중인 모듈, 풀던 문제, 쌓아둔 점수가 그대로 기다리고 있습니다.',
        }}
      >
        <div className="space-y-6">
          {message.text && message.status && (
            <Alert
              variant={message.status === 'error' ? 'destructive' : 'default'}
            >
              <AlertDescription className="text-xs">
                {t(message.text)}
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-[var(--warp-border)] bg-[var(--warp-surface)] shadow-none">
            <CardHeader>
              <CardTitle className="warp-body-heading">
                {t('sign-in')}
              </CardTitle>
              <CardDescription className="warp-body mt-2 text-[0.9375rem]">
                {t('login') || 'Log in to your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {authProviders.credentials && (
                <form onSubmit={formik.handleSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="email" className="warp-label">
                        {t('email')}
                      </FieldLabel>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="example@bu.ac.kr"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        className={cn(
                          'text-[0.9375rem]',
                          formik.touched.email &&
                            formik.errors.email &&
                            'border-destructive'
                        )}
                        required
                      />
                      {formik.touched.email && formik.errors.email && (
                        <FieldDescription className="text-destructive text-xs">
                          {formik.errors.email}
                        </FieldDescription>
                      )}
                    </Field>

                    <Field>
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="password" className="warp-label">
                          {t('password')}
                        </FieldLabel>
                        <Link
                          href="/auth/forgot-password"
                          className="warp-link text-xs"
                        >
                          {t('forgot-password')}
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={isPasswordVisible ? 'text' : 'password'}
                          placeholder={t('password')}
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          className={cn(
                            'text-[0.9375rem] pr-10',
                            formik.touched.password &&
                              formik.errors.password &&
                              'border-destructive'
                          )}
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setIsPasswordVisible(!isPasswordVisible)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isPasswordVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {formik.touched.password && formik.errors.password && (
                        <FieldDescription className="text-destructive text-xs">
                          {formik.errors.password}
                        </FieldDescription>
                      )}
                    </Field>

                    <div className="mt-2">
                      <GoogleReCAPTCHA
                        recaptchaRef={recaptchaRef}
                        onChange={setRecaptchaToken}
                        siteKey={recaptchaSiteKey}
                      />
                    </div>

                    <Field>
                      <Button
                        type="submit"
                        disabled={!formik.dirty || formik.isSubmitting}
                        className="h-11 w-full rounded-full text-base font-medium"
                      >
                        {formik.isSubmitting
                          ? t('loading') || 'Loading...'
                          : t('sign-in')}
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              )}

              {(authProviders.email || authProviders.saml) && (
                <div className="mt-6 space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[var(--warp-void)] px-3 text-[var(--warp-stone)]">
                        {t('or')}
                      </span>
                    </div>
                  </div>

                  {authProviders.email && (
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 w-full rounded-full text-base font-medium"
                    >
                      <Link href={`/auth/magic-link${params}`}>
                        {t('sign-in-with-email')}
                      </Link>
                    </Button>
                  )}

                  {authProviders.saml && (
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 w-full rounded-full text-base font-medium"
                    >
                      <Link href="/auth/sso">
                        {t('continue-with-saml-sso')}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-[var(--warp-stone)]">
            {t('dont-have-an-account')}{' '}
            <Link
              href={`/auth/join${params}`}
              className="font-medium text-foreground hover:text-accent transition-colors underline underline-offset-4"
            >
              {t('create-a-free-account')}
            </Link>
          </p>
        </div>
      </WarpAuthShell>
    </>
  );
};

Login.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;

  const csrfToken = await getCsrfToken(context);

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      csrfToken: csrfToken || null,
      authProviders: authProviderEnabled(),
      recaptchaSiteKey: env.recaptcha.siteKey,
      authStats: await getAuthStats(),
    },
  };
};

export default Login;
