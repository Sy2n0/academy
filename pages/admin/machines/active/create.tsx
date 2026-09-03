import { type ReactElement, useState, useRef } from 'react';
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

const CreateActiveMachine: NextPageWithLayout = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testingImage, setTestingImage] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string; size: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'DYNAMIC_CONTAINER' as
      | 'STATIC_ATTACHMENT'
      | 'DYNAMIC_ATTACHMENT'
      | 'STATIC_CONTAINER'
      | 'DYNAMIC_CONTAINER',
    category: '',
    maxAttempts: 'unlimited',
    score: 1000,
    difficultyFactor: 13.0,
    minimumScoreRatio: 20,
    bloodBonus: true,
    containerImage: '',
    servicePort: 1337,
    serviceProtocol: '',
    cpuLimit: 10,
    memoryLimit: 64,
    attachmentUrl: '',
    flagTemplate: 'flag{xxx}',
    staticFlags: [] as string[],
  });

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
      fd.append('machineId', formData.title || 'new-machine');

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
      // 첫 번째 파일이면 attachmentUrl 자동 세팅
      if (uploadedFiles.length === 0)
        handleChange('attachmentUrl', result.data.url);
      toast.success(`${result.data.name} 업로드 완료`);
    } catch (error: any) {
      toast.error(error.message || '업로드 실패');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title || !formData.category || !formData.containerImage) {
        toast.error('필수 항목을 모두 입력해주세요');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/machines/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          category: formData.category,
          maxAttempts:
            formData.maxAttempts === 'unlimited'
              ? null
              : parseInt(formData.maxAttempts),
          score: formData.score,
          difficultyFactor: formData.difficultyFactor,
          minimumScoreRatio: formData.minimumScoreRatio,
          bloodBonus: formData.bloodBonus,
          containerImage: formData.containerImage || null,
          servicePort: formData.servicePort || null,
          serviceProtocol: formData.serviceProtocol || null,
          cpuLimit: formData.cpuLimit || null,
          memoryLimit: formData.memoryLimit || null,
          storageLimit: null,
          enableTrafficCapture: false,
          hints: [],
          categoryType: 'active',
          attachmentUrl: formData.attachmentUrl || null,
          flagTemplate: formData.flagTemplate || null,
          staticFlags: formData.staticFlags,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            `머신 생성에 실패했습니다 (${response.status})`
        );
      }

      toast.success('Machine created successfully');
      setLoading(false);
      setTimeout(() => router.push('/admin/machines/active/manage'), 500);
    } catch (error: any) {
      toast.error(error?.message || '머신 생성에 실패했습니다');
      setLoading(false);
    }
  };

  const testContainerImage = async () => {
    if (!formData.containerImage) {
      toast.error('컨테이너 이미지를 먼저 입력해주세요');
      return;
    }

    setTestingImage(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/machines/active/test-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: formData.containerImage }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: result.data?.message || 'Image is valid',
        });
        toast.success('이미지 테스트 성공');
      } else {
        setTestResult({
          success: false,
          message: result?.error?.message || '이미지 테스트 실패',
        });
        toast.error('이미지 테스트 실패');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error?.message || '이미지 테스트 실패',
      });
      toast.error('이미지 테스트 실패');
    } finally {
      setTestingImage(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Machine - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Create machine" description="새 실습 머신 등록">
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className={adminTabsListClass}>
              {['basic', 'scoring', 'flags', 'files', 'docker'].map((tab) => (
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
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., SokopwnRev"
                  className="font-mono"
                  required
                />
              </Field>

              <Field label="Description" hint="Markdown supported">
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="문제 설명을 입력하세요..."
                  rows={6}
                  className="w-full px-3 py-2 border border-border/30 rounded-md bg-background/40 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors resize-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" required>
                  <Select
                    value={formData.category}
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

                <Field label="Type" hint="Cannot be changed after creation">
                  <Select
                    value={formData.type}
                    onValueChange={(v: any) => handleChange('type', v)}
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
                  value={formData.maxAttempts}
                  onValueChange={(v) => handleChange('maxAttempts', v)}
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
                    value={formData.score}
                    onChange={(e) =>
                      handleChange('score', parseInt(e.target.value) || 0)
                    }
                    className="font-mono"
                    required
                  />
                </Field>

                <Field label="Difficulty Factor">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.difficultyFactor}
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
                    value={formData.minimumScoreRatio}
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
                      formData.score * (formData.minimumScoreRatio / 100)
                    )}
                  </span>
                </p>
                <p>
                  Score after 10 solves:{' '}
                  <span className="text-foreground">
                    {Math.round(
                      formData.score * Math.exp(-10 / formData.difficultyFactor)
                    )}
                  </span>
                </p>
                <p>
                  Score after 50 solves:{' '}
                  <span className="text-foreground">
                    {Math.max(
                      Math.round(
                        formData.score * (formData.minimumScoreRatio / 100)
                      ),
                      Math.round(
                        formData.score *
                          Math.exp(-50 / formData.difficultyFactor)
                      )
                    )}
                  </span>
                </p>
              </div>

              <Field label="Blood Bonus">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.bloodBonus}
                    onCheckedChange={(v) => handleChange('bloodBonus', v)}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    First blood 보너스 점수 활성화
                  </span>
                </div>
              </Field>
            </TabsContent>

            {/* ── Flags ── */}
            <TabsContent value="flags" className="space-y-5">
              <Field
                label="Flag Template"
                hint="Dynamic flag 사용 시 {xxx} 형태로 placeholder 지정"
              >
                <Input
                  value={formData.flagTemplate}
                  onChange={(e) => handleChange('flagTemplate', e.target.value)}
                  placeholder="flag{xxx}"
                  className="font-mono"
                />
              </Field>

              <Field
                label="Static Flags"
                hint="Static 타입 사용 시, 쉼표로 구분"
              >
                <Input
                  value={formData.staticFlags.join(', ')}
                  onChange={(e) => {
                    const flags = e.target.value
                      .split(',')
                      .map((f) => f.trim())
                      .filter((f) => f);
                    handleChange('staticFlags', flags);
                  }}
                  placeholder="flag{abc123}, flag{def456}"
                  className="font-mono"
                />
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

              <Field
                label="Attachment URL"
                hint="업로드 후 자동 입력되거나 직접 입력 가능"
              >
                <Input
                  value={formData.attachmentUrl}
                  onChange={(e) =>
                    handleChange('attachmentUrl', e.target.value)
                  }
                  placeholder="https://..."
                  className="font-mono"
                />
              </Field>
            </TabsContent>

            {/* ── Docker ── */}
            <TabsContent value="docker" className="space-y-5">
              <Field label="Container Image" required>
                <div className="flex gap-2">
                  <Input
                    value={formData.containerImage}
                    onChange={(e) => {
                      handleChange('containerImage', e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="e.g., ctf/machine:latest"
                    className="font-mono"
                    required
                  />
                  <Button
                    type="button"
                    onClick={testContainerImage}
                    disabled={testingImage || !formData.containerImage}
                    variant="outline"
                    className="font-mono text-xs shrink-0"
                  >
                    {testingImage ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                {testResult && (
                  <p
                    className={`mt-1 text-xs ${testResult.success ? 'text-foreground' : 'text-destructive'}`}
                  >
                    {testResult.message}
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field
                  label="Protocol"
                  hint="접속 주소를 어떻게 만들지 정합니다"
                >
                  <select
                    value={formData.serviceProtocol}
                    onChange={(e) =>
                      handleChange('serviceProtocol', e.target.value)
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">자동 (category 기준)</option>
                    <option value="http">http — 브라우저로 열기</option>
                    <option value="https">https</option>
                    <option value="tcp">tcp — nc 명령</option>
                    <option value="ssh">ssh</option>
                  </select>
                </Field>

                <Field label="Service Port" required>
                  <Input
                    type="number"
                    value={formData.servicePort}
                    onChange={(e) =>
                      handleChange('servicePort', parseInt(e.target.value) || 0)
                    }
                    className="font-mono"
                    required
                  />
                </Field>

                <Field label="CPU Limit (×0.1 core)">
                  <Input
                    type="number"
                    value={formData.cpuLimit}
                    onChange={(e) =>
                      handleChange('cpuLimit', parseInt(e.target.value) || 0)
                    }
                    className="font-mono"
                  />
                </Field>

                <Field label="Memory Limit (MB)">
                  <Input
                    type="number"
                    value={formData.memoryLimit}
                    onChange={(e) =>
                      handleChange('memoryLimit', parseInt(e.target.value) || 0)
                    }
                    className="font-mono"
                  />
                </Field>
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="font-mono text-xs"
              onClick={() => router.push('/admin/machines/active/manage')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="font-mono text-xs uppercase tracking-wider"
            >
              {loading ? 'Creating...' : 'Create Machine'}
            </Button>
          </div>
        </form>
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
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

CreateActiveMachine.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default CreateActiveMachine;
