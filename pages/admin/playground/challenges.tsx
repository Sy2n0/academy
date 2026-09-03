import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StatBar } from '@/components/layouts/StatBar';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
} from '@/components/admin/styles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Flag, Plus, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface ChallengeDraft {
  id: string;
  playgroundCodeName: string;
  title: string;
  category: string;
  difficulty: string;
  value: number;
  flagType: string;
  flag: string;
  description: string;
  serverAddress: string | null;
  serverPort: number | null;
  attachments: AttachmentMeta[];
  createdAt: string;
}

interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
  key?: string;
  url?: string;
  scope?: 'public' | 'programming_answer';
}

interface PlaygroundSettingOption {
  id: string;
  codeName: string;
  season: string;
  isActive?: boolean;
}

const challengeCategories = [
  'programming',
  'web',
  'pwn',
  'reversing',
  'forensics',
  'crypto',
  'misc',
  'osint',
  'hardware',
];

const difficultyLevels = ['Example', 'Beignner', 'Easy', 'Medium', 'Hard'];

const uploadChallengeAttachment = async (
  file: File,
  codeName: string
): Promise<AttachmentMeta> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('codeName', codeName);

  const response = await fetch('/api/admin/playground/challenges/upload', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || '첨부파일 업로드에 실패했습니다');
  }

  return {
    name: result?.data?.name || file.name,
    size: Number(result?.data?.size ?? file.size),
    type: result?.data?.type || file.type,
    key: typeof result?.data?.key === 'string' ? result.data.key : undefined,
    url: typeof result?.data?.url === 'string' ? result.data.url : undefined,
  };
};

const toAttachmentArray = (value: unknown): AttachmentMeta[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map<AttachmentMeta | null>((item) => {
      if (!item || typeof item !== 'object') return null;
      const target = item as {
        name?: unknown;
        size?: unknown;
        type?: unknown;
        key?: unknown;
        url?: unknown;
        scope?: unknown;
      };
      if (typeof target.name !== 'string') return null;
      const scope: AttachmentMeta['scope'] =
        target.scope === 'programming_answer' ? 'programming_answer' : 'public';

      const parsed: AttachmentMeta = {
        name: target.name,
        size: typeof target.size === 'number' ? target.size : 0,
        type: typeof target.type === 'string' ? target.type : '',
        scope,
      };

      if (typeof target.key === 'string') {
        parsed.key = target.key;
      }

      if (typeof target.url === 'string') {
        parsed.url = target.url;
      }

      return parsed;
    })
    .filter((item): item is AttachmentMeta => item !== null);
};

const toAttachmentMeta = (file: File): AttachmentMeta => ({
  name: file.name,
  size: file.size,
  type: file.type,
  scope: 'public',
});

const isProgrammingCategory = (category: string) =>
  category.trim().toLowerCase() === 'programming';

const splitAttachments = (attachments: AttachmentMeta[]) => {
  const publicAttachments = attachments.filter(
    (item) => item.scope !== 'programming_answer'
  );
  const answerAttachment =
    attachments.find((item) => item.scope === 'programming_answer') || null;
  return { publicAttachments, answerAttachment };
};

const DescriptionMarkdownPreview = ({ value }: { value: string }) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        미리보기 내용이 없습니다.
      </p>
    );
  }

  return (
    <div className="prose prose-sm max-w-none prose-invert prose-a:text-white hover:prose-a:text-white/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
    </div>
  );
};

const PlaygroundChallengesPage: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const [drafts, setDrafts] = useState<ChallengeDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ChallengeDraft | null>(null);
  const [editAttachments, setEditAttachments] = useState<AttachmentMeta[]>([]);
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [playgroundOptions, setPlaygroundOptions] = useState<
    PlaygroundSettingOption[]
  >([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedAnswerFile, setSelectedAnswerFile] = useState<File | null>(
    null
  );
  const [editAnswerAttachment, setEditAnswerAttachment] =
    useState<AttachmentMeta | null>(null);
  const [editSelectedAnswerFile, setEditSelectedAnswerFile] =
    useState<File | null>(null);
  const [formData, setFormData] = useState({
    playgroundCodeName: '',
    title: '',
    category: '',
    difficulty: '',
    value: '100',
    flagType: 'static',
    flag: '',
    description: '',
    useInstance: false,
    serverAddress: '',
    serverPort: '',
  });
  const [editFormData, setEditFormData] = useState({
    id: '',
    playgroundCodeName: '',
    title: '',
    category: '',
    difficulty: '',
    value: '100',
    flagType: 'static',
    flag: '',
    description: '',
    useInstance: false,
    serverAddress: '',
    serverPort: '',
  });

  const totalPoints = useMemo(
    () => drafts.reduce((sum, challenge) => sum + challenge.value, 0),
    [drafts]
  );

  const loadChallenges = async (codeName: string) => {
    if (!codeName) {
      setDrafts([]);
      return;
    }

    try {
      setLoadingList(true);
      const response = await fetch(
        `/api/admin/playground/challenges?codeName=${encodeURIComponent(codeName)}`
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Failed to load challenges');
      }

      const items = Array.isArray(result?.data) ? result.data : [];
      setDrafts(
        items.map((item: any) => ({
          ...item,
          attachments: toAttachmentArray(item.attachments),
          description: item.description || '',
          serverAddress:
            typeof item.serverAddress === 'string' ? item.serverAddress : null,
          serverPort:
            typeof item.serverPort === 'number' ? item.serverPort : null,
        }))
      );
    } catch (error: any) {
      toast.error(error?.message || '챌린지 목록을 불러오지 못했습니다');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(
          '/api/admin/playground/settings?list=true'
        );
        const result = await response.json();
        const items: PlaygroundSettingOption[] = Array.isArray(result?.data)
          ? result.data.map((item: any) => ({
              id: item.id,
              codeName: item.codeName,
              season: item.season,
              isActive: item.isActive,
            }))
          : [];

        setPlaygroundOptions(items);

        const defaultCodeName =
          items.find((item) => item.isActive)?.codeName ||
          items[0]?.codeName ||
          '';

        if (defaultCodeName) {
          setFormData((prev) => ({
            ...prev,
            playgroundCodeName: defaultCodeName,
          }));
          loadChallenges(defaultCodeName);
        }
      } catch {
        toast.error('Playground 설정 목록을 불러오지 못했습니다');
      }
    };

    loadSettings();
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (
      field === 'category' &&
      typeof value === 'string' &&
      !isProgrammingCategory(value)
    ) {
      setSelectedAnswerFile(null);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.playgroundCodeName ||
      !formData.title ||
      !formData.category ||
      !formData.difficulty ||
      !formData.flag
    ) {
      toast.error('필수 항목을 모두 입력해주세요');
      return;
    }

    const numericValue = Number(formData.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error('포인트는 1 이상의 숫자여야 합니다');
      return;
    }

    const parsedServerPort = formData.serverPort.trim()
      ? Number(formData.serverPort)
      : null;
    if (
      parsedServerPort !== null &&
      (!Number.isInteger(parsedServerPort) ||
        parsedServerPort < 1 ||
        parsedServerPort > 65535)
    ) {
      toast.error('PORT는 1~65535 사이의 정수여야 합니다');
      return;
    }

    if (formData.useInstance) {
      if (!formData.serverAddress.trim()) {
        toast.error('Instance 사용 시 Server Address를 입력해주세요');
        return;
      }
      if (parsedServerPort === null) {
        toast.error('Instance 사용 시 PORT를 입력해주세요');
        return;
      }
    }

    setSubmitting(true);

    try {
      const uploadedAttachments = selectedFiles.length
        ? await Promise.all(
            selectedFiles.map((file) =>
              uploadChallengeAttachment(file, formData.playgroundCodeName)
            )
          )
        : [];

      const uploadedAnswerAttachment = selectedAnswerFile
        ? await uploadChallengeAttachment(
            selectedAnswerFile,
            formData.playgroundCodeName
          )
        : null;

      const payloadAttachments: AttachmentMeta[] = [
        ...uploadedAttachments.map((item) => ({
          ...item,
          scope: 'public' as const,
        })),
      ];

      if (
        uploadedAnswerAttachment &&
        isProgrammingCategory(formData.category)
      ) {
        payloadAttachments.push({
          ...uploadedAnswerAttachment,
          scope: 'programming_answer',
        });
      }

      const response = await fetch('/api/admin/playground/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playgroundCodeName: formData.playgroundCodeName,
          title: formData.title.trim(),
          category: formData.category,
          difficulty: formData.difficulty,
          value: numericValue,
          flagType: formData.flagType,
          flag: formData.flag.trim(),
          description: formData.description.trim(),
          serverAddress: formData.useInstance
            ? formData.serverAddress.trim() || null
            : null,
          serverPort: formData.useInstance ? parsedServerPort : null,
          attachments: payloadAttachments,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message || 'Challenge 생성에 실패했습니다'
        );
      }

      toast.success('Challenge created');
      await loadChallenges(formData.playgroundCodeName);
    } catch (error: any) {
      toast.error(error?.message || 'Challenge 생성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }

    setFormData((prev) => ({
      ...prev,
      title: '',
      category: '',
      difficulty: '',
      value: '100',
      flagType: 'static',
      flag: '',
      description: '',
      useInstance: false,
      serverAddress: '',
      serverPort: '',
    }));
    setSelectedFiles([]);
    setSelectedAnswerFile(null);
  };

  const handleEditDraft = (challenge: ChallengeDraft) => {
    setEditingDraft(challenge);
    setEditFormData({
      id: challenge.id,
      playgroundCodeName: challenge.playgroundCodeName,
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
      value: String(challenge.value),
      flagType: challenge.flagType,
      flag: challenge.flag,
      description: challenge.description || '',
      useInstance: Boolean(challenge.serverAddress && challenge.serverPort),
      serverAddress: challenge.serverAddress || '',
      serverPort: challenge.serverPort ? String(challenge.serverPort) : '',
    });
    const parsedAttachments = toAttachmentArray(challenge.attachments);
    const { publicAttachments, answerAttachment } =
      splitAttachments(parsedAttachments);
    setEditAttachments(publicAttachments);
    setEditAnswerAttachment(answerAttachment);
    setEditSelectedFiles([]);
    setEditSelectedAnswerFile(null);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (
      field === 'category' &&
      typeof value === 'string' &&
      !isProgrammingCategory(value)
    ) {
      setEditAnswerAttachment(null);
      setEditSelectedAnswerFile(null);
    }
  };

  const handleEditModalOpenChange = (open: boolean) => {
    setIsEditModalOpen(open);
    if (!open) {
      setEditingDraft(null);
      setEditAttachments([]);
      setEditSelectedFiles([]);
      setEditAnswerAttachment(null);
      setEditSelectedAnswerFile(null);
      setEditFormData({
        id: '',
        playgroundCodeName: '',
        title: '',
        category: '',
        difficulty: '',
        value: '100',
        flagType: 'static',
        flag: '',
        description: '',
        useInstance: false,
        serverAddress: '',
        serverPort: '',
      });
    }
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setEditSelectedFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...files].forEach((file) => {
        map.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      });
      return Array.from(map.values());
    });
  };

  const handleRemoveEditAttachment = (target: AttachmentMeta) => {
    setEditAttachments((prev) =>
      prev.filter(
        (item) =>
          !(
            item.name === target.name &&
            item.size === target.size &&
            item.type === target.type
          )
      )
    );
  };

  const handleRemoveEditFile = (target: File) => {
    setEditSelectedFiles((prev) =>
      prev.filter(
        (file) =>
          !(
            file.name === target.name &&
            file.size === target.size &&
            file.lastModified === target.lastModified
          )
      )
    );
  };

  const handleUpdateDraft = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !editFormData.id ||
      !editFormData.playgroundCodeName ||
      !editFormData.title ||
      !editFormData.category ||
      !editFormData.difficulty ||
      !editFormData.flag
    ) {
      toast.error('필수 항목을 모두 입력해주세요');
      return;
    }

    const numericValue = Number(editFormData.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error('포인트는 1 이상의 숫자여야 합니다');
      return;
    }

    const parsedServerPort = editFormData.serverPort.trim()
      ? Number(editFormData.serverPort)
      : null;
    if (
      parsedServerPort !== null &&
      (!Number.isInteger(parsedServerPort) ||
        parsedServerPort < 1 ||
        parsedServerPort > 65535)
    ) {
      toast.error('PORT는 1~65535 사이의 정수여야 합니다');
      return;
    }

    if (editFormData.useInstance) {
      if (!editFormData.serverAddress.trim()) {
        toast.error('Instance 사용 시 Server Address를 입력해주세요');
        return;
      }
      if (parsedServerPort === null) {
        toast.error('Instance 사용 시 PORT를 입력해주세요');
        return;
      }
    }

    setEditSubmitting(true);
    try {
      const uploadedEditAttachments = editSelectedFiles.length
        ? await Promise.all(
            editSelectedFiles.map((file) =>
              uploadChallengeAttachment(file, editFormData.playgroundCodeName)
            )
          )
        : [];

      const uploadedEditAnswerAttachment = editSelectedAnswerFile
        ? await uploadChallengeAttachment(
            editSelectedAnswerFile,
            editFormData.playgroundCodeName
          )
        : null;

      const mergedMap = new Map<string, AttachmentMeta>();
      [...editAttachments, ...uploadedEditAttachments].forEach((item) => {
        mergedMap.set(`${item.name}-${item.size}-${item.type}`, {
          ...item,
          scope: 'public',
        });
      });

      const payloadAttachments: AttachmentMeta[] = Array.from(
        mergedMap.values()
      );

      if (isProgrammingCategory(editFormData.category)) {
        const answerAttachment = uploadedEditAnswerAttachment
          ? {
              ...uploadedEditAnswerAttachment,
              scope: 'programming_answer' as const,
            }
          : editAnswerAttachment;

        if (answerAttachment) {
          payloadAttachments.push({
            ...answerAttachment,
            scope: 'programming_answer',
          });
        }
      }

      const response = await fetch('/api/admin/playground/challenges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editFormData.id,
          playgroundCodeName: editFormData.playgroundCodeName,
          title: editFormData.title.trim(),
          category: editFormData.category,
          difficulty: editFormData.difficulty,
          value: numericValue,
          flagType: editFormData.flagType,
          flag: editFormData.flag.trim(),
          description: editFormData.description.trim(),
          serverAddress: editFormData.useInstance
            ? editFormData.serverAddress.trim() || null
            : null,
          serverPort: editFormData.useInstance ? parsedServerPort : null,
          attachments: payloadAttachments,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error?.message || 'Challenge 수정에 실패했습니다'
        );
      }

      toast.success('Challenge updated');
      await loadChallenges(
        formData.playgroundCodeName || editFormData.playgroundCodeName
      );
      handleEditModalOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Challenge 수정에 실패했습니다');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteDraft = async (challenge: ChallengeDraft) => {
    const confirmed = window.confirm(`Delete challenge "${challenge.title}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(challenge.id);
      const response = await fetch('/api/admin/playground/challenges', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: challenge.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error?.message || 'Challenge 삭제에 실패했습니다'
        );
      }

      toast.success('Challenge deleted');
      if (editingDraft?.id === challenge.id) {
        handleEditModalOpenChange(false);
      }
      await loadChallenges(formData.playgroundCodeName);
    } catch (error: any) {
      toast.error(error?.message || 'Challenge 삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...files].forEach((file) => {
        map.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      });
      return Array.from(map.values());
    });
  };

  const handleRemoveFile = (target: File) => {
    setSelectedFiles((prev) =>
      prev.filter(
        (file) =>
          !(
            file.name === target.name &&
            file.size === target.size &&
            file.lastModified === target.lastModified
          )
      )
    );
  };

  const handleAnswerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedAnswerFile(file);
  };

  const handleEditAnswerFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    setEditSelectedAnswerFile(file);
    if (file) {
      setEditAnswerAttachment(null);
    }
  };

  return (
    <>
      <Head>
        <title>Playground Challenges - Admin - HUB ACADEMY</title>
      </Head>

      <AdminLayout title="Challenges" description="Playground 문제 등록">
        <StatBar
          stats={[
            { label: 'Challenges', value: drafts.length },
            { label: 'Total points', value: totalPoints },
          ]}
        />

        <div className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-5">
            <form
              onSubmit={handleCreateDraft}
              className="space-y-3 border-r border-[var(--warp-rule)] pr-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <Plus className="h-4 w-4 text-foreground" />
                <h2 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Create Challenge Draft
                </h2>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Playground CodeName
                </Label>
                <Select
                  value={formData.playgroundCodeName}
                  onValueChange={(value) => {
                    handleChange('playgroundCodeName', value);
                    loadChallenges(value);
                  }}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue placeholder="Select codeName" />
                  </SelectTrigger>
                  <SelectContent>
                    {playgroundOptions.map((option) => (
                      <SelectItem
                        key={option.id}
                        value={option.codeName}
                        className="font-mono text-xs"
                      >
                        {option.codeName.toUpperCase()} ({option.season})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="title"
                  className="font-mono text-[10px] uppercase tracking-wider"
                >
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., SQL Ghost"
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {challengeCategories.map((category) => (
                        <SelectItem
                          key={category}
                          value={category}
                          className="font-mono text-xs"
                        >
                          {category.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Difficulty
                  </Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => handleChange('difficulty', value)}
                  >
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((difficulty) => (
                        <SelectItem
                          key={difficulty}
                          value={difficulty}
                          className="font-mono text-xs"
                        >
                          {difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="value"
                    className="font-mono text-[10px] uppercase tracking-wider"
                  >
                    Value
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min={1}
                    value={formData.value}
                    onChange={(e) => handleChange('value', e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Flag Type
                  </Label>
                  <Select
                    value={formData.flagType}
                    onValueChange={(value) => handleChange('flagType', value)}
                  >
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static" className="font-mono text-xs">
                        STATIC
                      </SelectItem>
                      <SelectItem value="regex" className="font-mono text-xs">
                        REGEX
                      </SelectItem>
                      <SelectItem value="dynamic" className="font-mono text-xs">
                        DYNAMIC
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Instance 사용
                </Label>
                <Select
                  value={formData.useInstance ? 'enabled' : 'disabled'}
                  onValueChange={(value) =>
                    handleChange('useInstance', value === 'enabled')
                  }
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled" className="font-mono text-xs">
                      사용 안 함
                    </SelectItem>
                    <SelectItem value="enabled" className="font-mono text-xs">
                      사용 함
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.useInstance && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="serverAddress"
                      className="font-mono text-[10px] uppercase tracking-wider"
                    >
                      Server Address
                    </Label>
                    <Input
                      id="serverAddress"
                      value={formData.serverAddress}
                      onChange={(e) =>
                        handleChange('serverAddress', e.target.value)
                      }
                      placeholder="e.g., 10.0.0.5 or ctf.example.com"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="serverPort"
                      className="font-mono text-[10px] uppercase tracking-wider"
                    >
                      PORT
                    </Label>
                    <Input
                      id="serverPort"
                      type="number"
                      min={1}
                      max={65535}
                      value={formData.serverPort}
                      onChange={(e) =>
                        handleChange('serverPort', e.target.value)
                      }
                      placeholder="e.g., 8080"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="flag"
                  className="font-mono text-[10px] uppercase tracking-wider"
                >
                  Flag
                </Label>
                <Input
                  id="flag"
                  value={formData.flag}
                  onChange={(e) => handleChange('flag', e.target.value)}
                  placeholder="HUB{example_flag}"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="description"
                  className="font-mono text-[10px] uppercase tracking-wider"
                >
                  Description
                </Label>
                <textarea
                  id="description"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Challenge description (Markdown-ready)"
                  className="w-full px-3 py-2 border border-border/30 rounded bg-background/60 font-mono text-xs text-foreground placeholder:text-muted-foreground resize-none"
                />
                <div className="rounded border border-border/30 bg-background/40 p-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Markdown Preview
                  </p>
                  <DescriptionMarkdownPreview value={formData.description} />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="attachments"
                  className="font-mono text-[10px] uppercase tracking-wider"
                >
                  Attachments
                </Label>
                <label
                  htmlFor="attachments"
                  className="flex items-center justify-between gap-2 px-3 py-3 border border-dashed border-border/40 rounded bg-background/40 cursor-pointer hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      Add challenge files (zip, txt, image, etc.)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-foreground">
                    Select
                  </span>
                </label>
                <input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFiles.length > 0 && (
                  <div className="space-y-1.5 border border-border/20 rounded p-2 bg-background/30">
                    {selectedFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-foreground truncate">
                            {file.name}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                            {file.type ? ` · ${file.type}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file)}
                          className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isProgrammingCategory(formData.category) && (
                <div className="space-y-2">
                  <Label
                    htmlFor="answer-code"
                    className="font-mono text-[10px] uppercase tracking-wider"
                  >
                    Correct Code File (Programming)
                  </Label>
                  <label
                    htmlFor="answer-code"
                    className="flex items-center justify-between gap-2 px-3 py-3 border border-dashed border-border/40 rounded bg-background/40 cursor-pointer hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-xs text-muted-foreground">
                        Upload the official solution code file
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase text-foreground">
                      Select
                    </span>
                  </label>
                  <input
                    id="answer-code"
                    type="file"
                    onChange={handleAnswerFileSelect}
                    className="hidden"
                  />

                  {selectedAnswerFile && (
                    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60 border border-border/20">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-foreground truncate">
                          {selectedAnswerFile.name}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {(selectedAnswerFile.size / 1024).toFixed(1)} KB
                          {selectedAnswerFile.type
                            ? ` · ${selectedAnswerFile.type}`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAnswerFile(null)}
                        className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className={`${adminButtonPrimaryClass} w-full`}
              >
                {submitting ? 'Adding...' : 'Add Challenge Draft'}
              </Button>
            </form>

            <div className="border border-border/30 rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="h-4 w-4 text-foreground" />
                <h2 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Draft Challenge List
                </h2>
              </div>

              {loadingList ? (
                <div className="py-8 text-center border border-dashed border-border/40 rounded">
                  <p className="font-mono text-xs text-muted-foreground">
                    Loading challenge list...
                  </p>
                </div>
              ) : drafts.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border/40 rounded">
                  <p className="font-mono text-xs text-muted-foreground">
                    No challenge drafts yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-[var(--warp-rule)]">
                        <th className="py-2 pr-4 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          CodeName
                        </th>
                        <th className="py-2 pr-4 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Title
                        </th>
                        <th className="py-2 pr-4 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Category
                        </th>
                        <th className="py-2 pr-4 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Difficulty
                        </th>
                        <th className="py-2 pr-4 text-right text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Points
                        </th>
                        <th className="py-2 pr-4 text-right text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Files
                        </th>
                        <th className="py-2 pr-4 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Flag Type
                        </th>
                        <th className="py-2 pr-4 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Created
                        </th>
                        <th className="py-2 pr-4 text-right text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((challenge) => (
                        <tr
                          key={challenge.id}
                          className="border-b border-[var(--warp-rule)]"
                        >
                          <td className="py-2.5 pr-4 text-xs uppercase text-muted-foreground">
                            {challenge.playgroundCodeName}
                          </td>
                          <td className="py-2.5 pr-4 text-sm text-foreground">
                            {challenge.title}
                          </td>
                          <td className="py-2.5 pr-4 text-xs uppercase text-muted-foreground">
                            {challenge.category}
                          </td>
                          <td className="py-2.5 pr-4 text-xs uppercase text-muted-foreground">
                            {challenge.difficulty}
                          </td>
                          <td className="warp-num py-2.5 pr-4 text-right text-sm text-foreground">
                            {challenge.value}
                          </td>
                          <td className="warp-num py-2.5 pr-4 text-right text-sm text-foreground">
                            {challenge.attachments.length}
                          </td>
                          <td className="py-2.5 pr-4 text-xs uppercase text-muted-foreground">
                            {challenge.flagType}
                          </td>
                          <td className="warp-num py-2.5 pr-4 text-xs text-muted-foreground">
                            {new Date(challenge.createdAt).toLocaleString(
                              'ko-KR',
                              {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                onClick={() => handleEditDraft(challenge)}
                                className={adminButtonClass}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleDeleteDraft(challenge)}
                                disabled={deletingId === challenge.id}
                                className={`${adminButtonClass} hover:text-destructive`}
                              >
                                {deletingId === challenge.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>

      <Dialog open={isEditModalOpen} onOpenChange={handleEditModalOpenChange}>
        <DialogContent className="max-h-[90vh] w-[92vw] max-w-[720px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-wider text-foreground">
              Edit Challenge Draft
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateDraft} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Playground CodeName
              </Label>
              <Select
                value={editFormData.playgroundCodeName}
                onValueChange={(value) =>
                  handleEditChange('playgroundCodeName', value)
                }
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="Select codeName" />
                </SelectTrigger>
                <SelectContent>
                  {playgroundOptions.map((option) => (
                    <SelectItem
                      key={option.id}
                      value={option.codeName}
                      className="font-mono text-xs"
                    >
                      {option.codeName.toUpperCase()} ({option.season})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Title
              </Label>
              <Input
                value={editFormData.title}
                onChange={(e) => handleEditChange('title', e.target.value)}
                placeholder="e.g., SQL Ghost"
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </Label>
                <Select
                  value={editFormData.category}
                  onValueChange={(value) => handleEditChange('category', value)}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {challengeCategories.map((category) => (
                      <SelectItem
                        key={category}
                        value={category}
                        className="font-mono text-xs"
                      >
                        {category.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Difficulty
                </Label>
                <Select
                  value={editFormData.difficulty}
                  onValueChange={(value) =>
                    handleEditChange('difficulty', value)
                  }
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((difficulty) => (
                      <SelectItem
                        key={difficulty}
                        value={difficulty}
                        className="font-mono text-xs"
                      >
                        {difficulty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Value
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={editFormData.value}
                  onChange={(e) => handleEditChange('value', e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Flag Type
                </Label>
                <Select
                  value={editFormData.flagType}
                  onValueChange={(value) => handleEditChange('flagType', value)}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static" className="font-mono text-xs">
                      STATIC
                    </SelectItem>
                    <SelectItem value="regex" className="font-mono text-xs">
                      REGEX
                    </SelectItem>
                    <SelectItem value="dynamic" className="font-mono text-xs">
                      DYNAMIC
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Instance 사용
              </Label>
              <Select
                value={editFormData.useInstance ? 'enabled' : 'disabled'}
                onValueChange={(value) =>
                  handleEditChange('useInstance', value === 'enabled')
                }
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled" className="font-mono text-xs">
                    사용 안 함
                  </SelectItem>
                  <SelectItem value="enabled" className="font-mono text-xs">
                    사용 함
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editFormData.useInstance && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Server Address
                  </Label>
                  <Input
                    value={editFormData.serverAddress}
                    onChange={(e) =>
                      handleEditChange('serverAddress', e.target.value)
                    }
                    placeholder="e.g., 10.0.0.5 or ctf.example.com"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    PORT
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={editFormData.serverPort}
                    onChange={(e) =>
                      handleEditChange('serverPort', e.target.value)
                    }
                    placeholder="e.g., 8080"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Flag
              </Label>
              <Input
                value={editFormData.flag}
                onChange={(e) => handleEditChange('flag', e.target.value)}
                placeholder="HUB{example_flag}"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Description
              </Label>
              <textarea
                rows={5}
                value={editFormData.description}
                onChange={(e) =>
                  handleEditChange('description', e.target.value)
                }
                placeholder="Challenge description (Markdown-ready)"
                className="w-full px-3 py-2 border border-border/30 rounded bg-background/60 font-mono text-xs text-foreground placeholder:text-muted-foreground resize-none"
              />
              <div className="rounded border border-border/30 bg-background/40 p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Markdown Preview
                </p>
                <DescriptionMarkdownPreview value={editFormData.description} />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-attachments"
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                Attachments
              </Label>
              <label
                htmlFor="edit-attachments"
                className="flex items-center justify-between gap-2 px-3 py-3 border border-dashed border-border/40 rounded bg-background/40 cursor-pointer hover:border-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">
                    Add more files to this challenge
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase text-foreground">
                  Select
                </span>
              </label>
              <input
                id="edit-attachments"
                type="file"
                multiple
                onChange={handleEditFileSelect}
                className="hidden"
              />

              {editAttachments.length > 0 && (
                <div className="space-y-1.5 border border-border/20 rounded p-2 bg-background/30">
                  {editAttachments.map((file) => (
                    <div
                      key={`stored-${file.name}-${file.size}-${file.type}`}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                          {file.type ? ` · ${file.type}` : ''} · STORED
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEditAttachment(file)}
                        className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {editSelectedFiles.length > 0 && (
                <div className="space-y-1.5 border border-border/20 rounded p-2 bg-background/30">
                  {editSelectedFiles.map((file) => (
                    <div
                      key={`new-${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                          {file.type ? ` · ${file.type}` : ''} · NEW
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEditFile(file)}
                        className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isProgrammingCategory(editFormData.category) && (
              <div className="space-y-2">
                <Label
                  htmlFor="edit-answer-code"
                  className="font-mono text-[10px] uppercase tracking-wider"
                >
                  Correct Code File (Programming)
                </Label>
                <label
                  htmlFor="edit-answer-code"
                  className="flex items-center justify-between gap-2 px-3 py-3 border border-dashed border-border/40 rounded bg-background/40 cursor-pointer hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      Upload or replace the official solution code file
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-foreground">
                    Select
                  </span>
                </label>
                <input
                  id="edit-answer-code"
                  type="file"
                  onChange={handleEditAnswerFileSelect}
                  className="hidden"
                />

                {editAnswerAttachment && !editSelectedAnswerFile && (
                  <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60 border border-border/20">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-foreground truncate">
                        {editAnswerAttachment.name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {(editAnswerAttachment.size / 1024).toFixed(1)} KB
                        {editAnswerAttachment.type
                          ? ` · ${editAnswerAttachment.type}`
                          : ''}{' '}
                        · STORED
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditAnswerAttachment(null)}
                      className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {editSelectedAnswerFile && (
                  <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60 border border-border/20">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-foreground truncate">
                        {editSelectedAnswerFile.name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {(editSelectedAnswerFile.size / 1024).toFixed(1)} KB
                        {editSelectedAnswerFile.type
                          ? ` · ${editSelectedAnswerFile.type}`
                          : ''}{' '}
                        · NEW
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditSelectedAnswerFile(null)}
                      className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditModalOpenChange(false)}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSubmitting}
                className={adminButtonPrimaryClass}
              >
                {editSubmitting ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

PlaygroundChallengesPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default PlaygroundChallengesPage;
