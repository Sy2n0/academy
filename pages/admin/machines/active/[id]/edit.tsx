import { type ReactElement, useState, useEffect, useRef } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  adminTabsListClass,
  adminTabsTriggerClass,
} from '@/components/admin/styles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSession } from '@/lib/session';
import { getUserBySession } from 'models/user';
import { isAdmin } from '@/lib/user-roles';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import useSWR from 'swr';
import { Upload, X, FileIcon } from 'lucide-react';

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

interface MachineDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  maxAttempts: number | null;
  score: number;
  difficultyFactor: number;
  minimumScoreRatio: number;
  bloodBonus: boolean;
  containerImage: string | null;
  servicePort: number | null;
  cpuLimit: number | null;
  memoryLimit: number | null;
  storageLimit: number | null;
  enableTrafficCapture: boolean;
  attachmentUrl: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EditMachine: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [formData, setFormData] = useState<Partial<MachineDetail>>({});
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string; size: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, error, isLoading } = useSWR<{
    data: { machine: MachineDetail };
  }>(id ? `/api/admin/machines/active/${id}` : null, fetcher);

  useEffect(() => {
    if (data?.data?.machine) {
      setFormData(data.data.machine);
    }
  }, [data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('machineId', typeof id === 'string' ? id : 'unknown');

      const response = await fetch('/api/admin/machines/active/upload', {
        method: 'POST',
        body: fd,
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error?.message || '업로드 실패');

      setUploadedFiles((prev) => [
        ...prev,
        {
          name: result.data.name,
          url: result.data.url,
          size: result.data.size,
        },
      ]);
      // attachmentUrl 자동 세팅 후 바로 저장
      const updatedForm = { ...formData, attachmentUrl: result.data.url };
      setFormData(updatedForm);
      await fetch(`/api/admin/machines/active/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedForm),
      });
      toast.success(`${result.data.name} 업로드 완료`);
    } catch (error: any) {
      toast.error(error.message || '업로드 실패');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!id || typeof id !== 'string') return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/machines/active/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('변경사항 저장에 실패했습니다');
      toast.success('Saved');
    } catch (error: any) {
      toast.error(error.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || typeof id !== 'string') return;
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/machines/active/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('삭제 실패');
      toast.success('Deleted');
      router.push('/admin/machines/active/manage');
    } catch (error: any) {
      toast.error(error.message || '삭제 실패');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data?.data?.machine) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-sm text-destructive">Machine not found</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Machine - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Edit machine" description="머신 설정 수정">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className={adminTabsListClass}>
            {['basic', 'scoring', 'files', 'docker'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={adminTabsTriggerClass}
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Basic ── */}
          <TabsContent value="basic" className="space-y-5">
            <Field label="Name" required>
              <Input
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="font-mono"
              />
            </Field>

            <Field label="Description" hint="Markdown supported">
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-border/30 rounded-md bg-background/40 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors resize-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" required>
                <Select
                  value={formData.category || ''}
                  onValueChange={(v) => handleChange('category', v)}
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pwn">Pwn</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="forensics">Forensics</SelectItem>
                    <SelectItem value="reversing">Reversing</SelectItem>
                    <SelectItem value="misc">Misc</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Type">
                <Select
                  value={formData.type || ''}
                  onValueChange={(v) => handleChange('type', v)}
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STATIC_ATTACHMENT">
                      Static Attachment
                    </SelectItem>
                    <SelectItem value="DYNAMIC_ATTACHMENT">
                      Dynamic Attachment
                    </SelectItem>
                    <SelectItem value="STATIC_CONTAINER">
                      Static Container
                    </SelectItem>
                    <SelectItem value="DYNAMIC_CONTAINER">
                      Dynamic Container
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Max Attempts">
              <Select
                value={
                  formData.maxAttempts === null
                    ? 'unlimited'
                    : String(formData.maxAttempts)
                }
                onValueChange={(v) =>
                  handleChange(
                    'maxAttempts',
                    v === 'unlimited' ? null : parseInt(v)
                  )
                }
              >
                <SelectTrigger className="font-mono w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </TabsContent>

          {/* ── Scoring ── */}
          <TabsContent value="scoring" className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Initial Score" required>
                <Input
                  type="number"
                  value={formData.score ?? 1000}
                  onChange={(e) =>
                    handleChange('score', parseInt(e.target.value) || 0)
                  }
                  className="font-mono"
                />
              </Field>

              <Field label="Difficulty Factor">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.difficultyFactor ?? 13}
                  onChange={(e) =>
                    handleChange(
                      'difficultyFactor',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="font-mono"
                />
              </Field>

              <Field label="Min Score Ratio (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.minimumScoreRatio ?? 20}
                  onChange={(e) =>
                    handleChange(
                      'minimumScoreRatio',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="p-3 border border-border/30 rounded-md bg-background/40 font-mono text-xs text-muted-foreground space-y-1">
              <p>
                Min score:{' '}
                <span className="text-foreground">
                  {Math.round(
                    (formData.score ?? 1000) *
                      ((formData.minimumScoreRatio ?? 20) / 100)
                  )}
                </span>
              </p>
              <p>
                Score after 10 solves:{' '}
                <span className="text-foreground">
                  {Math.round(
                    (formData.score ?? 1000) *
                      Math.exp(-10 / (formData.difficultyFactor ?? 13))
                  )}
                </span>
              </p>
              <p>
                Score after 50 solves:{' '}
                <span className="text-foreground">
                  {Math.max(
                    Math.round(
                      (formData.score ?? 1000) *
                        ((formData.minimumScoreRatio ?? 20) / 100)
                    ),
                    Math.round(
                      (formData.score ?? 1000) *
                        Math.exp(-50 / (formData.difficultyFactor ?? 13))
                    )
                  )}
                </span>
              </p>
            </div>

            <Field label="Blood Bonus">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.bloodBonus ?? false}
                  onCheckedChange={(v) => handleChange('bloodBonus', v)}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  First blood 보너스 점수 활성화
                </span>
              </div>
            </Field>
          </TabsContent>

          {/* ── Files ── */}
          <TabsContent value="files" className="space-y-5">
            <div
              className="border-2 border-dashed border-border/50 rounded-md p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="font-mono text-xs text-muted-foreground">
                {uploading ? 'Uploading...' : '클릭하여 파일 업로드'}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground mt-1">
                최대 500MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 border border-border/30 rounded-md bg-background/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-foreground truncate">
                          {f.name}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {(f.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="warp-num text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        URL
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedFiles((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Docker ── */}
          <TabsContent value="docker" className="space-y-5">
            <Field label="Container Image" required>
              <Input
                value={formData.containerImage || ''}
                onChange={(e) => handleChange('containerImage', e.target.value)}
                placeholder="e.g., ctf/machine:latest"
                className="font-mono"
              />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Service Port" required>
                <Input
                  type="number"
                  value={formData.servicePort ?? 1337}
                  onChange={(e) =>
                    handleChange('servicePort', parseInt(e.target.value) || 0)
                  }
                  className="font-mono"
                />
              </Field>

              <Field label="CPU Limit (×0.1 core)">
                <Input
                  type="number"
                  value={formData.cpuLimit ?? 10}
                  onChange={(e) =>
                    handleChange('cpuLimit', parseInt(e.target.value) || 0)
                  }
                  className="font-mono"
                />
              </Field>

              <Field label="Memory Limit (MB)">
                <Input
                  type="number"
                  value={formData.memoryLimit ?? 64}
                  onChange={(e) =>
                    handleChange('memoryLimit', parseInt(e.target.value) || 0)
                  }
                  className="font-mono"
                />
              </Field>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-6 flex justify-between items-center">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="font-mono text-xs"
            onClick={handleDelete}
          >
            Delete
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="font-mono text-xs"
              onClick={() => router.push('/admin/machines/active/manage')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              className="font-mono text-xs uppercase tracking-wider"
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {hint && (
        <p className="font-mono text-[11px] text-muted-foreground">{hint}</p>
      )}
      {children}
    </div>
  );
}

EditMachine.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default EditMachine;
