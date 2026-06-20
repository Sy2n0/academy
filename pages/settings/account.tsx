import type { NextPageWithLayout } from 'types';
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { type ReactElement } from 'react';
import { useTranslation } from 'next-i18next';

import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { AnimatedNoise } from '@/components/animated-noise';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { findManySessions } from 'models/session';
import { fetchApiKeys } from 'models/apiKey';
import { prisma } from '@/lib/prisma';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import Head from 'next/head';
import {
  CheckCircle2,
  XCircle,
  Shield,
  Clock,
  User,
  Mail,
  Key,
  Plus,
  Copy,
  Check,
  Crown,
} from 'lucide-react';
import { UserRole } from '@prisma/client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import { useFormik } from 'formik';
import { createApiKeySchema } from '@/lib/zod';
import { defaultHeaders } from '@/lib/common';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

type AccountProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Account: NextPageWithLayout<AccountProps> = ({
  user: initialUser,
  sessions,
  apiKeys: initialApiKeys,
  team,
}) => {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const [user, setUser] = useState(initialUser);
  const [apiKeys, setApiKeys] = useState(initialApiKeys || []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // DB에서 최신 user 정보 가져오기 (role 포함)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        const data = (await response.json()) as ApiResponse<any>;
        if (data.data) {
          setUser(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    if (session) {
      fetchUser();
    }
  }, [session]);

  const formik = useFormik({
    initialValues: {
      name: '',
    },
    validateOnBlur: false,
    validate: (values) => {
      try {
        createApiKeySchema.parse(values);
      } catch (error: any) {
        return error.formErrors.fieldErrors;
      }
    },
    onSubmit: async (values) => {
      if (!team) {
        toast.error('팀을 찾을 수 없습니다');
        return;
      }

      try {
        const response = await fetch(`/api/teams/${team.slug}/api-keys`, {
          method: 'POST',
          body: JSON.stringify(values),
          headers: defaultHeaders,
        });

        const { data, error } = (await response.json()) as ApiResponse<{
          apiKey: string;
        }>;

        if (error) {
          toast.error(error.message);
          return;
        }

        if (data?.apiKey) {
          setCreatedApiKey(data.apiKey);
          toast.success(t('api-key-created') || 'API Key created successfully');
          // API Key 목록 새로고침
          const refreshResponse = await fetch(
            `/api/teams/${team.slug}/api-keys`
          );
          const refreshData = (await refreshResponse.json()) as ApiResponse<
            any[]
          >;
          if (refreshData.data) {
            setApiKeys(refreshData.data);
          }
        }
      } catch (error: any) {
        toast.error(error.message || 'API 키 생성에 실패했습니다');
      }
    },
  });

  const handleCopyApiKey = async () => {
    if (createdApiKey) {
      await navigator.clipboard.writeText(createdApiKey);
      setCopied(true);
      toast.success('API Key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setCreatedApiKey(null);
    formik.resetForm();
  };

  return (
    <>
      <Head>
        <title>HUB ACADEMY</title>
      </Head>

      <div className="relative min-h-screen bg-background">
        <AnimatedNoise opacity={0.03} />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

        <div className="relative z-10">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Account
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="space-y-2">
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    ACCOUNT
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    Your account information and security status
                  </p>
                </div>

                {/* 계정 정보 섹션 */}
                <div className="grid auto-rows-min gap-6 md:grid-cols-2">
                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      ACCOUNT INFO
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Account ID
                        </p>
                        <p className="font-mono text-sm text-foreground break-all">
                          {user.id}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Member Since
                        </p>
                        <p className="font-mono text-sm text-foreground">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                'en-US',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                }
                              )
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Last Updated
                        </p>
                        <p className="font-mono text-sm text-foreground">
                          {user.updatedAt
                            ? new Date(user.updatedAt).toLocaleDateString(
                                'en-US',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Role
                        </p>
                        <div className="flex items-center gap-2">
                          {(user.role === UserRole.ADMIN ||
                            user.role === 'ADMIN') && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded border text-xs font-mono uppercase tracking-wider ${
                              user.role === UserRole.ADMIN ||
                              user.role === 'ADMIN'
                                ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                : user.role === UserRole.LAB ||
                                    user.role === 'LAB'
                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {user.role || UserRole.USER}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      SECURITY STATUS
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Email Verification
                        </p>
                        <div className="flex items-center gap-2">
                          {user.emailVerified ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <p className="font-mono text-sm text-foreground">
                                Verified
                              </p>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-destructive" />
                              <p className="font-mono text-sm text-foreground">
                                Not Verified
                              </p>
                            </>
                          )}
                        </div>
                        {user.emailVerified && (
                          <p className="font-mono text-xs text-muted-foreground mt-1">
                            Verified on{' '}
                            {new Date(user.emailVerified).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Account Status
                        </p>
                        <div className="flex items-center gap-2">
                          {user.lockedAt ? (
                            <>
                              <XCircle className="h-4 w-4 text-destructive" />
                              <p className="font-mono text-sm text-destructive">
                                Locked
                              </p>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <p className="font-mono text-sm text-foreground">
                                Active
                              </p>
                            </>
                          )}
                        </div>
                        {user.invalidLoginAttempts > 0 && (
                          <p className="font-mono text-xs text-muted-foreground mt-1">
                            {user.invalidLoginAttempts} failed login attempt
                            {user.invalidLoginAttempts > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Active Sessions
                        </p>
                        <p className="font-mono text-sm text-foreground">
                          {sessions?.length || 0} active session
                          {sessions?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 활성 세션 */}
                {sessions && sessions.length > 0 && (
                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      ACTIVE SESSIONS
                    </h3>
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                        >
                          <div className="flex-1">
                            <p className="font-mono text-sm text-foreground">
                              Session ID: {session.id.substring(0, 8)}...
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              Created:{' '}
                              {new Date(session.createdAt).toLocaleDateString(
                                'en-US',
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </p>
                            {session.expires && (
                              <p className="font-mono text-xs text-muted-foreground">
                                Expires:{' '}
                                {new Date(session.expires).toLocaleDateString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 프로필 섹션 */}
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    PROFILE
                  </h3>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 rounded-full">
                      <AvatarImage
                        src={user.image || undefined}
                        alt={user.name || 'User'}
                        className="object-cover rounded-full"
                      />
                      <AvatarFallback className="bg-muted text-foreground font-mono text-lg rounded-full">
                        {user.name
                          ? user.name.substring(0, 2).toUpperCase()
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="space-y-2">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            Name
                          </p>
                          <p className="font-mono text-lg text-foreground">
                            {user.name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            Email
                          </p>
                          <p className="font-mono text-sm text-foreground">
                            {user.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Keys 섹션 */}
                {team && (
                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API KEYS
                      </h3>
                      <Button
                        size="sm"
                        className="font-mono text-xs uppercase tracking-wider"
                        onClick={() => setCreateModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </div>
                    {apiKeys && apiKeys.length > 0 ? (
                      <div className="space-y-3">
                        {apiKeys.map((apiKey) => (
                          <div
                            key={apiKey.id}
                            className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                          >
                            <div className="flex-1">
                              <p className="font-mono text-sm text-foreground">
                                {apiKey.name}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                Created:{' '}
                                {new Date(apiKey.createdAt).toLocaleDateString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  }
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 px-2 py-1 rounded border border-green-500/30 bg-green-500/10">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="font-mono text-[10px] text-green-500 uppercase tracking-wider">
                                  Active
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-mono text-xs uppercase tracking-wider text-destructive hover:text-destructive"
                                onClick={async () => {
                                  if (
                                    confirm(
                                      'Are you sure you want to revoke this API key?'
                                    )
                                  ) {
                                    try {
                                      const response = await fetch(
                                        `/api/teams/${team.slug}/api-keys/${apiKey.id}`,
                                        {
                                          method: 'DELETE',
                                        }
                                      );

                                      if (!response.ok) {
                                        const json =
                                          (await response.json()) as ApiResponse;
                                        toast.error(
                                          json.error?.message ||
                                            'API 키 해제에 실패했습니다'
                                        );
                                        return;
                                      }

                                      toast.success('API key revoked');
                                      window.location.reload();
                                    } catch (error) {
                                      toast.error('API 키 해제에 실패했습니다');
                                    }
                                  }
                                }}
                              >
                                Revoke
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="font-mono text-sm text-muted-foreground">
                        No API keys found. Create one to get started.
                      </p>
                    )}
                  </div>
                )}

                {/* API Key 생성 모달 */}
                <Dialog
                  open={createModalOpen}
                  onOpenChange={setCreateModalOpen}
                >
                  <DialogContent className="border-border/30 bg-card/95 backdrop-blur-sm">
                    {createdApiKey ? (
                      <>
                        <DialogHeader>
                          <DialogTitle className="font-mono text-xs uppercase tracking-wider">
                            {t('new-api-key') || 'New API Key'}
                          </DialogTitle>
                          <DialogDescription className="font-mono text-xs text-destructive">
                            {t('new-api-warning') ||
                              "Please copy this API key now. You won't be able to see it again!"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <FieldGroup>
                            <Field>
                              <FieldLabel className="font-mono text-xs uppercase tracking-wider">
                                {t('api-key') || 'API Key'}
                              </FieldLabel>
                              <div className="relative">
                                <Input
                                  value={createdApiKey}
                                  readOnly
                                  className="font-mono text-sm pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={handleCopyApiKey}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </Field>
                          </FieldGroup>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={handleCloseModal}
                            className="font-mono text-xs uppercase tracking-wider"
                          >
                            {t('close') || 'Close'}
                          </Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <>
                        <DialogHeader>
                          <DialogTitle className="font-mono text-xs uppercase tracking-wider">
                            {t('new-api-key') || 'New API Key'}
                          </DialogTitle>
                          <DialogDescription className="font-mono text-xs">
                            {t('api-key-description') ||
                              'Create a new API key for your team'}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={formik.handleSubmit}>
                          <div className="space-y-4 mb-6">
                            <FieldGroup>
                              <Field>
                                <FieldLabel
                                  htmlFor="name"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  {t('name') || 'Name'}
                                </FieldLabel>
                                <Input
                                  id="name"
                                  name="name"
                                  type="text"
                                  placeholder="My API Key"
                                  value={formik.values.name}
                                  onChange={formik.handleChange}
                                  className={cn(
                                    'font-mono text-sm',
                                    formik.touched.name &&
                                      formik.errors.name &&
                                      'border-destructive'
                                  )}
                                  required
                                />
                                {formik.touched.name && formik.errors.name && (
                                  <FieldDescription className="text-destructive font-mono text-xs">
                                    {formik.errors.name}
                                  </FieldDescription>
                                )}
                              </Field>
                            </FieldGroup>
                          </div>
                          <DialogFooter className="mt-6">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCloseModal}
                              className="font-mono text-xs uppercase tracking-wider"
                            >
                              {t('cancel') || 'Cancel'}
                            </Button>
                            <Button
                              type="submit"
                              disabled={
                                !formik.dirty ||
                                !formik.isValid ||
                                formik.isSubmitting
                              }
                              className="font-mono text-xs uppercase tracking-wider"
                            >
                              {formik.isSubmitting
                                ? t('loading') || 'Loading...'
                                : t('create-api-key') || 'Create API Key'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserBySession(session);
  const { locale } = context;

  if (!user) {
    return {
      notFound: true,
    };
  }

  // 활성 세션 조회
  const sessions = await findManySessions({
    where: {
      userId: user.id,
      expires: {
        gt: new Date(),
      },
    },
    orderBy: {
      expires: 'desc',
    },
  });

  // 사용자가 속한 첫 번째 팀 조회
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      team: true,
    },
  });

  // 팀이 있으면 API Key 조회
  let apiKeys: Awaited<ReturnType<typeof fetchApiKeys>> = [];
  if (teamMember?.team) {
    apiKeys = await fetchApiKeys(teamMember.team.id);
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role || 'USER',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() || null,
        lockedAt: user.lockedAt?.toISOString() || null,
        invalidLoginAttempts: user.invalid_login_attempts || 0,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.expires.toISOString(),
        expires: s.expires?.toISOString() || null,
      })),
      team: teamMember?.team
        ? {
            id: teamMember.team.id,
            name: teamMember.team.name,
            slug: teamMember.team.slug,
          }
        : null,
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        createdAt: key.createdAt.toISOString(),
      })),
    },
  };
};

Account.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Account;
