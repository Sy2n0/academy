import { type ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
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
import { AnimatedNoise } from '@/components/animated-noise';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { UpdateAccount } from '@/components/account';
import UpdatePassword from '@/components/account/UpdatePassword';
import UpdateTheme from '@/components/account/UpdateTheme';
import Head from 'next/head';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Palette,
  Bell,
  Globe,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
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
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import { useFormik } from 'formik';
import { defaultHeaders } from '@/lib/common';
import { cn } from '@/lib/utils';
import * as Yup from 'yup';

type SettingsProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Settings: NextPageWithLayout<SettingsProps> = ({ user }) => {
  const { t } = useTranslation('common');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const deleteFormik = useFormik({
    initialValues: {
      confirm: '',
    },
    validationSchema: Yup.object().shape({
      confirm: Yup.string()
        .required()
        .oneOf(['DELETE'], 'Please type DELETE to confirm'),
    }),
    onSubmit: async () => {
      if (deleteConfirm !== 'DELETE') {
        toast.error('확인을 위해 DELETE를 입력해주세요');
        return;
      }

      try {
        const response = await fetch('/api/users', {
          method: 'DELETE',
          headers: defaultHeaders,
        });

        if (!response.ok) {
          const json = (await response.json()) as ApiResponse;
          toast.error(json.error?.message || '계정 삭제에 실패했습니다');
          return;
        }

        toast.success('Account deleted successfully');
        window.location.href = '/auth/login';
      } catch (error) {
        toast.error('계정 삭제에 실패했습니다');
      }
    },
  });

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
                          Settings
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 md:p-12 pt-6">
                <div className="space-y-2">
                  <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight text-foreground">
                    SETTINGS
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    Manage your account settings and preferences
                  </p>
                </div>

                {/* Profile Settings */}
                <div className="rounded-md border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <User className="h-4 w-4" />
                    <h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
                      PROFILE SETTINGS
                    </h2>
                  </div>
                  <UpdateAccount user={user} allowEmailChange={false} />
                </div>

                {/* Security Settings */}
                <div className="rounded-md border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Lock className="h-4 w-4" />
                    <h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
                      SECURITY
                    </h2>
                  </div>
                  <UpdatePassword />
                </div>

                {/* Preferences */}
                {/* {env.darkModeEnabled && (
                  <div className="rounded-md border border-border/30 bg-card/50 backdrop-blur-sm p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Palette className="h-4 w-4" />
                      <h2 className="font-mono text-xs uppercase tracking-wider text-foreground">
                        PREFERENCES
                      </h2>
                    </div>
                    <UpdateTheme />
                  </div>
                )} */}

                {/* Danger Zone */}
                <div className="rounded-md border border-destructive/30 bg-destructive/5 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <h2 className="font-mono text-xs uppercase tracking-wider text-destructive">
                      DANGER ZONE
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="font-mono text-sm text-foreground mb-2">
                        Delete Account
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mb-4">
                        Once you delete your account, there is no going back.
                        Please be certain.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteAccountOpen(true)}
                        className="font-mono text-xs uppercase tracking-wider"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent className="border-border/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-destructive">
              Delete Account
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              This action cannot be undone. This will permanently delete your
              account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={deleteFormik.handleSubmit}>
            <div className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel className="font-mono text-xs uppercase tracking-wider">
                    Type <span className="text-destructive">DELETE</span> to
                    confirm
                  </FieldLabel>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    className="font-mono text-sm"
                    required
                  />
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteAccountOpen(false);
                  setDeleteConfirm('');
                }}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  deleteConfirm !== 'DELETE' || deleteFormik.isSubmitting
                }
                className="font-mono text-xs uppercase tracking-wider"
              >
                {deleteFormik.isSubmitting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
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

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    },
  };
}

Settings.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Settings;
