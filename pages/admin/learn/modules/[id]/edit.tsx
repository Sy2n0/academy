import { type ReactElement, useState, useEffect } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
} from '@/components/admin/styles';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { Save, ArrowLeft } from 'lucide-react';
import useSWR from 'swr';

interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string;
  difficulty: string;
  duration: string | null;
  tier: string;
  type: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('불러오기에 실패했습니다');
  }
  return res.json();
};

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

const AdminModuleEditPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [saving, setSaving] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    difficulty: 'Fundamental',
    duration: '',
    tier: 'Tier 0',
    type: 'REGULAR',
    imageUrl: '',
    isActive: true,
  });

  const { data, error, isLoading } = useSWR<{ data: Module }>(
    id ? `/api/admin/learn/modules/${id}` : null,
    fetcher
  );

  useEffect(() => {
    if (data?.data) {
      const module = data.data;
      setFormData({
        title: module.title || '',
        description: module.description || '',
        category: module.category || 'GENERAL',
        difficulty: module.difficulty || 'Fundamental',
        duration: module.duration || '',
        tier: module.tier || 'Tier 0',
        type: module.type || 'REGULAR',
        imageUrl: module.imageUrl || '',
        isActive: module.isActive ?? true,
      });
      setHasContent(!!module.content);
    }
  }, [data]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('제목은 필수입니다');
      return;
    }

    setSaving(true);
    try {
      // content는 제외하고 저장 (content는 별도 페이지에서만 편집)
      const { content, ...dataToSave } = formData as any;
      const response = await fetch(`/api/admin/learn/modules/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error?.message || '모듈 수정에 실패했습니다');
        } else {
          throw new Error(
            `모듈 수정에 실패했습니다: ${response.status} ${response.statusText}`
          );
        }
      }

      toast.success('Module updated successfully');
      router.push('/admin/learn/modules');
    } catch (error: any) {
      toast.error(error.message || '모듈 수정에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-destructive">
          모듈을 불러오지 못했습니다
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Module - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout
        title={formData.title || 'Untitled module'}
        description="모듈 설정"
      >
        <div className="mb-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/learn/modules')}
            className={adminButtonClass}
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={adminButtonPrimaryClass}
          >
            <Save className="h-3 w-3" />
            Save
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="mb-4 border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="title"
                    className="font-mono text-sm font-semibold"
                  >
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value,
                      })
                    }
                    className="font-mono text-sm mt-1"
                    placeholder="Module title"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="description"
                    className="font-mono text-sm font-semibold"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    className="font-mono text-sm mt-1 min-h-[100px]"
                    placeholder="Module description"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="imageUrl"
                    className="font-mono text-sm font-semibold"
                  >
                    Image URL
                  </Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        imageUrl: e.target.value,
                      })
                    }
                    className="font-mono text-sm mt-1"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Module Settings */}
            <div>
              <h2 className="mb-4 border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Module Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="category"
                    className="font-mono text-sm font-semibold"
                  >
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="font-mono text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">GENERAL</SelectItem>
                      <SelectItem value="OFFENSIVE">OFFENSIVE</SelectItem>
                      <SelectItem value="DEFENSIVE">DEFENSIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="difficulty"
                    className="font-mono text-sm font-semibold"
                  >
                    Difficulty
                  </Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        difficulty: value,
                      })
                    }
                  >
                    <SelectTrigger className="font-mono text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fundamental">Fundamental</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="tier"
                    className="font-mono text-sm font-semibold"
                  >
                    Tier
                  </Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tier: value })
                    }
                  >
                    <SelectTrigger className="font-mono text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tier 0">Tier 0</SelectItem>
                      <SelectItem value="Tier I">Tier I</SelectItem>
                      <SelectItem value="Tier II">Tier II</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="type"
                    className="font-mono text-sm font-semibold"
                  >
                    Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger className="font-mono text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGULAR">REGULAR</SelectItem>
                      <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="duration"
                    className="font-mono text-sm font-semibold"
                  >
                    Duration
                  </Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: e.target.value,
                      })
                    }
                    className="font-mono text-sm mt-1"
                    placeholder="e.g., 3h, 6h"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="isActive"
                    className="font-mono text-sm font-semibold"
                  >
                    Active
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        isActive: checked,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Content Link */}
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 border-b border-[var(--warp-rule)] pb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Module Content
              </h2>
              <div className="space-y-4">
                <p className="font-mono text-sm text-muted-foreground">
                  강의 내용은 별도 페이지에서 작성할 수 있습니다.
                </p>
                <Button
                  onClick={() =>
                    router.push(`/admin/learn/modules/${id}/content`)
                  }
                  className={`${adminButtonPrimaryClass} w-full`}
                >
                  {hasContent ? 'Edit Content' : 'Create Content'}
                </Button>
                {hasContent && (
                  <div className="mt-4 p-4 bg-background/40 border border-border/30 rounded-lg">
                    <p className="font-mono text-xs text-muted-foreground mb-2">
                      Content exists. Click &quot;Edit Content&quot; to view and
                      edit.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

AdminModuleEditPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminModuleEditPage;
