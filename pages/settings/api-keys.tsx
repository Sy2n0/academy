import type { NextPageWithLayout, ApiResponse } from 'types';
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { useFormik } from 'formik';
import toast from 'react-hot-toast';
import { Check, CheckCircle2, Copy, Plus } from 'lucide-react';

import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { fetchApiKeys } from 'models/apiKey';
import { prisma } from '@/lib/prisma';
import { createApiKeySchema } from '@/lib/zod';
import { defaultHeaders } from '@/lib/common';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

type ApiKeysProps = InferGetServerSidePropsType<typeof getServerSideProps>;

/**
 * API keys used to live inside the Account page, below the profile, the account
 * facts, the security status and the session list. They are a team-level
 * credential, not personal account information, and they carry their own
 * creation dialog and form — so they get their own tab.
 */
const ApiKeys: NextPageWithLayout<ApiKeysProps> = ({
  apiKeys: initialApiKeys,
  team,
}) => {
  const { t } = useTranslation('common');
  const [apiKeys, setApiKeys] = useState(initialApiKeys || []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formik = useFormik({
    initialValues: { name: '' },
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

      <SettingsLayout
        title="API Keys"
        description="팀 단위로 발급되는 자격 증명입니다. 생성 직후 한 번만 표시됩니다."
      >
        {team ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Keys
              </h2>
              <Button
                size="sm"
                className="text-xs uppercase tracking-wider"
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
                    className="flex items-center justify-between py-3 border-b border-[var(--warp-rule)] last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{apiKey.name}</p>
                      <p className="warp-num text-xs text-muted-foreground">
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
                      <div className="flex items-center gap-2 px-2 py-1 rounded border border-success/30 bg-success/10">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span className="text-[10px] text-success uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs uppercase tracking-wider text-destructive hover:text-destructive"
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
              <p className="text-sm text-muted-foreground">
                No API keys found. Create one to get started.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            API 키는 팀에 속한 계정에서만 발급할 수 있습니다.
          </p>
        )}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="border-[var(--warp-rule)] bg-[var(--warp-surface)]">
            {createdApiKey ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xs uppercase tracking-wider">
                    {t('new-api-key') || 'New API Key'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-destructive">
                    {t('new-api-warning') ||
                      "Please copy this API key now. You won't be able to see it again!"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel className="text-xs uppercase tracking-wider">
                        {t('api-key') || 'API Key'}
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          value={createdApiKey}
                          readOnly
                          className="text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={handleCopyApiKey}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-success" />
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
                    className="text-xs uppercase tracking-wider"
                  >
                    {t('close') || 'Close'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xs uppercase tracking-wider">
                    {t('new-api-key') || 'New API Key'}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
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
                          className="text-xs uppercase tracking-wider"
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
                            ' text-sm',
                            formik.touched.name &&
                              formik.errors.name &&
                              'border-destructive'
                          )}
                          required
                        />
                        {formik.touched.name && formik.errors.name && (
                          <FieldDescription className="text-destructive text-xs">
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
                      className="text-xs uppercase tracking-wider"
                    >
                      {t('cancel') || 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !formik.dirty || !formik.isValid || formik.isSubmitting
                      }
                      className="text-xs uppercase tracking-wider"
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
        </Dialog>{' '}
      </SettingsLayout>
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
    return { notFound: true };
  }

  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    include: { team: true },
  });

  let apiKeys: Awaited<ReturnType<typeof fetchApiKeys>> = [];
  if (teamMember?.team) {
    apiKeys = await fetchApiKeys(teamMember.team.id);
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
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

ApiKeys.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default ApiKeys;
