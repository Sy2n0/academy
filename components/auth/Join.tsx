import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { defaultHeaders, passwordPolicies } from '@/lib/common';
import { useFormik } from 'formik';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import * as Yup from 'yup';
import AgreeMessage from './AgreeMessage';
import GoogleReCAPTCHA from '../shared/GoogleReCAPTCHA';
import ReCAPTCHA from 'react-google-recaptcha';
import { maxLengthPolicies } from '@/lib/common';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface JoinProps {
  recaptchaSiteKey: string | null;
}

const JoinUserSchema = Yup.object().shape({
  name: Yup.string().required().max(maxLengthPolicies.name),
  email: Yup.string()
    .required()
    .email()
    .max(maxLengthPolicies.email)
    .test('bu-ac-kr-domain', 'Email must be from bu.ac.kr domain', (value) => {
      if (!value) return false;
      return value.endsWith('@bu.ac.kr');
    }),
  password: Yup.string()
    .required()
    .min(passwordPolicies.minLength)
    .max(maxLengthPolicies.password),
  team: Yup.string().required().min(3).max(maxLengthPolicies.team),
});

const DISCORD_BOT_API_URL = 'https://discord.hub-h4ck.com';

const Join = ({ recaptchaSiteKey }: JoinProps) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [tokenValidation, setTokenValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  const tokenValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      team: '',
    },
    validationSchema: JoinUserSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      // 토큰이 유효하지 않으면 제출 방지
      if (tokenValidation.status !== 'valid') {
        toast.error(t('token-invalid') || 'Please enter a valid token');
        return;
      }

      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          ...values,
          recaptchaToken,
        }),
      }).catch((error) => {
        console.error('Fetch error:', error);
        // fetch 자체가 실패한 경우 (네트워크 에러 등)
        recaptchaRef.current?.reset();
        toast.error('Network error occurred. If your account was created, please try logging in.');
        throw error;
      });

      // 응답 본문 파싱
      let json: ApiResponse<{ confirmEmail: boolean }>;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response');
        }
        json = JSON.parse(text) as ApiResponse<{ confirmEmail: boolean }>;
      } catch (parseError) {
        console.error('Response parse error:', parseError);
        recaptchaRef.current?.reset();
        // 파싱 실패했지만 가입은 완료되었을 수 있음
        if (response.ok) {
          toast.success(t('successfully-joined') || 'Account created successfully. Please try logging in.');
          formik.resetForm();
          setTokenValidation({ status: 'idle' });
          router.push('/auth/login');
        } else {
          toast.error('An error occurred. Please try again.');
        }
        return;
      }

      recaptchaRef.current?.reset();

      if (!response.ok) {
        const errorMessage = json.error?.message || 'An error occurred';
        console.error('API Error:', json.error);
        toast.error(errorMessage);
        return;
      }

      formik.resetForm();
      setTokenValidation({ status: 'idle' });

      if (json.data?.confirmEmail) {
        router.push('/auth/verify-email');
      } else {
        toast.success(t('successfully-joined'));
        router.push('/auth/login');
      }
    },
  });

  // 토큰 검증 함수
  const validateToken = async (token: string) => {
    if (!token || token.length < 3) {
      setTokenValidation({ status: 'idle' });
      return;
    }

    setTokenValidation({ status: 'validating' });

    try {
      const response = await fetch(`${DISCORD_BOT_API_URL}/api/tokens/${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setTokenValidation({ status: 'valid', message: t('token-valid') || 'Valid token' });
      } else {
        setTokenValidation({ status: 'invalid', message: t('token-invalid') || 'Invalid token' });
      }
    } catch (error) {
      setTokenValidation({ status: 'invalid', message: t('token-validation-error') || 'Failed to validate token' });
    }
  };

  // 토큰 입력값 변경 시 debounce 적용하여 검증
  useEffect(() => {
    const token = formik.values.team;

    // 이전 timeout 취소
    if (tokenValidationTimeoutRef.current) {
      clearTimeout(tokenValidationTimeoutRef.current);
    }

    // 500ms 후에 검증 실행
    tokenValidationTimeoutRef.current = setTimeout(() => {
      validateToken(token);
    }, 500);

    return () => {
      if (tokenValidationTimeoutRef.current) {
        clearTimeout(tokenValidationTimeoutRef.current);
      }
    };
  }, [formik.values.team, t]);

  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-[var(--font-bebas)] tracking-tight">
            {t('create-account')}
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            {t('create-a-new-account')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={formik.handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name" className="font-mono text-xs uppercase tracking-wider">
                  {t('name')}
                </FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t('your-name')}
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  className={cn(
                    "font-mono text-sm",
                    formik.touched.name && formik.errors.name && "border-destructive"
                  )}
                  required
                />
                {formik.touched.name && formik.errors.name && (
                  <FieldDescription className="text-destructive font-mono text-xs">
                    {formik.errors.name}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="team" className="font-mono text-xs uppercase tracking-wider">
                  {t('token') || 'Token'}
                </FieldLabel>
                <Input
                  id="team"
                  name="team"
                  type="text"
                  placeholder={t('token-placeholder') || 'Enter your token'}
                  value={formik.values.team}
                  onChange={formik.handleChange}
                  className={cn(
                    "font-mono text-sm",
                    formik.errors.team && "border-destructive",
                    tokenValidation.status === 'valid' && "border-green-500",
                    tokenValidation.status === 'invalid' && "border-destructive"
                  )}
                  required
                />
                {tokenValidation.status === 'validating' && (
                  <FieldDescription className="font-mono text-xs text-muted-foreground">
                    {t('validating-token') || 'Validating token...'}
                  </FieldDescription>
                )}
                {tokenValidation.status === 'valid' && (
                  <FieldDescription className="font-mono text-xs text-green-500">
                    {tokenValidation.message}
                  </FieldDescription>
                )}
                {tokenValidation.status === 'invalid' && (
                  <FieldDescription className="font-mono text-xs text-destructive">
                    {tokenValidation.message}
                  </FieldDescription>
                )}
                {formik.errors.team && (
                  <FieldDescription className="text-destructive font-mono text-xs">
                    {formik.errors.team}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="email" className="font-mono text-xs uppercase tracking-wider">
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
                    "font-mono text-sm",
                    formik.errors.email && "border-destructive"
                  )}
                  required
                />
                {formik.errors.email && (
                  <FieldDescription className="text-destructive font-mono text-xs">
                    {formik.errors.email}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password" className="font-mono text-xs uppercase tracking-wider">
                      {t('password')}
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={isPasswordVisible ? 'text' : 'password'}
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        className={cn(
                          "font-mono text-sm pr-10",
                          formik.errors.password && "border-destructive"
                        )}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isPasswordVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {formik.errors.password && (
                      <FieldDescription className="text-destructive font-mono text-xs">
                        {formik.errors.password}
                      </FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password" className="font-mono text-xs uppercase tracking-wider">
                      {t('confirm-password') || 'Confirm Password'}
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      className="font-mono text-sm pr-10"
                    />
                  </Field>
                </Field>
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
                  disabled={!formik.dirty || formik.isSubmitting || tokenValidation.status !== 'valid'}
                  className="w-full font-mono text-xs uppercase tracking-wider"
                >
                  {formik.isSubmitting ? t('loading') || 'Loading...' : t('create-account')}
                </Button>
                <FieldDescription className="text-center font-mono text-xs">
                  {t('already-have-an-account') || 'Already have an account?'}{' '}
                  <Link href="/auth/login" className="underline underline-offset-4 hover:text-accent transition-colors">
                    {t('sign-in')}
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      {/* <FieldDescription className="px-6 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <AgreeMessage text={t('create-account')} />
      </FieldDescription> */}
    </div>
  );
};

export default Join;
