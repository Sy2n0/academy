import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AppSidebar } from '@/components/app-sidebar';
import { AnimatedNoise } from '@/components/animated-noise';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { PlaygroundPreview } from '@/components/playground-preview';

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

  // 관리자만 접근 가능
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

interface SettingsHistoryItem {
  id: string;
  name: string;
  codeName: string;
  badgeName: string;
  badgeImage: string;
  badgeDescription: string;
  season: string;
  type: string;
  startDate: string;
  endDate: string;
  description: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

const parseApiBody = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return { rawText: text };
};

const toDateTimeLocalInput = (
  value?: string | null,
  defaultTime: '00:00:00' | '23:59:59' = '00:00:00'
) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T${defaultTime}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  const second = String(parsed.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};

const AdminPlayground: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [settingsHistory, setSettingsHistory] = useState<SettingsHistoryItem[]>(
    []
  );
  const [selectedSetting, setSelectedSetting] =
    useState<SettingsHistoryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<
    'basic' | 'schedule' | 'badge'
  >('basic');
  const [formData, setFormData] = useState({
    name: '',
    codeName: '',
    badgeName: '',
    badgeImage: '',
    badgeDescription: '',
    season: '',
    type: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 필수 필드 검증
      if (
        !formData.name ||
        !formData.codeName ||
        !formData.season ||
        !formData.type
      ) {
        toast.error('필수 항목을 모두 입력해주세요');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/playground/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(editingSettingId ? { id: editingSettingId } : {}),
        }),
      });

      const result = await parseApiBody(response);

      if (!response.ok) {
        const errorMessage =
          result?.error?.message ||
          (typeof result?.rawText === 'string' && result.rawText.trim()
            ? '설정 저장 중 서버 응답이 올바르지 않습니다.'
            : '') ||
          `설정 저장에 실패했습니다 (${response.status})`;
        throw new Error(errorMessage);
      }
      // 저장된 설정으로 formData 업데이트
      if (result.data) {
        setFormData({
          name: result.data.name || '',
          codeName: result.data.codeName || '',
          badgeName: result.data.badgeName || '',
          badgeImage: result.data.badgeImage || '',
          badgeDescription: result.data.badgeDescription || '',
          season: result.data.season || '',
          type: result.data.type || '',
          startDate: toDateTimeLocalInput(result.data.startDate, '00:00:00'),
          endDate: toDateTimeLocalInput(result.data.endDate, '23:59:59'),
          description: result.data.description || '',
        });
      }

      toast.success(
        editingSettingId
          ? 'Playground settings updated successfully'
          : 'Playground settings saved successfully'
      );
      setEditingSettingId(result?.data?.id || null);

      // 설정 리스트 새로고침
      loadSettingsHistory();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error?.message || '플레이그라운드 설정 저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Load settings history
  const loadSettingsHistory = async () => {
    try {
      const response = await fetch('/api/admin/playground/settings?list=true');
      const data = await parseApiBody(response);
      if (response.ok) {
        console.log('Settings history response:', data);
        if (data.data && Array.isArray(data.data)) {
          console.log('Setting history:', data.data);
          setSettingsHistory(data.data);
        } else {
          console.log('No settings history data or not an array');
          setSettingsHistory([]);
        }
      } else {
        console.error('Failed to fetch settings history:', response.status);
        setSettingsHistory([]);
      }
    } catch (error) {
      console.error('Failed to load settings history:', error);
      setSettingsHistory([]);
    }
  };

  // Set a setting as active
  const handleSetActive = async (settingId: string) => {
    try {
      const response = await fetch('/api/admin/playground/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: settingId }),
      });

      const result = await parseApiBody(response);

      if (!response.ok) {
        const errorMessage =
          result?.error?.message ||
          (typeof result?.rawText === 'string' && result.rawText.trim()
            ? '활성 설정 변경 중 서버 응답이 올바르지 않습니다.'
            : '') ||
          `활성 설정 변경에 실패했습니다 (${response.status})`;
        throw new Error(errorMessage);
      }

      toast.success('Settings activated successfully');

      // 설정 리스트 및 현재 설정 새로고침
      loadSettingsHistory();

      // 현재 활성 설정도 업데이트
      const currentResponse = await fetch('/api/admin/playground/settings');
      if (currentResponse.ok) {
        const currentData = await parseApiBody(currentResponse);
        if (currentData.data) {
          setFormData({
            name: currentData.data.name || '',
            codeName: currentData.data.codeName || '',
            badgeName: currentData.data.badgeName || '',
            badgeImage: currentData.data.badgeImage || '',
            badgeDescription: currentData.data.badgeDescription || '',
            season: currentData.data.season || '',
            type: currentData.data.type || '',
            startDate: toDateTimeLocalInput(
              currentData.data.startDate,
              '00:00:00'
            ),
            endDate: toDateTimeLocalInput(currentData.data.endDate, '23:59:59'),
            description: currentData.data.description || '',
          });
        }
      }
    } catch (error: any) {
      console.error('Error setting active:', error);
      toast.error(error?.message || '활성 설정 변경에 실패했습니다');
    }
  };

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/playground/settings');
        if (response.ok) {
          const data = await parseApiBody(response);
          if (data.data) {
            setFormData({
              name: data.data.name || '',
              codeName: data.data.codeName || '',
              badgeName: data.data.badgeName || '',
              badgeImage: data.data.badgeImage || '',
              badgeDescription: data.data.badgeDescription || '',
              season: data.data.season || '',
              type: data.data.type || '',
              startDate: toDateTimeLocalInput(data.data.startDate, '00:00:00'),
              endDate: toDateTimeLocalInput(data.data.endDate, '23:59:59'),
              description: data.data.description || '',
            });
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
    loadSettingsHistory();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditSetting = (setting: SettingsHistoryItem) => {
    setEditingSettingId(setting.id);
    setFormData({
      name: setting.name || '',
      codeName: setting.codeName || '',
      badgeName: setting.badgeName || '',
      badgeImage: setting.badgeImage || '',
      badgeDescription: setting.badgeDescription || '',
      season: setting.season || '',
      type: setting.type || '',
      startDate: toDateTimeLocalInput(setting.startDate, '00:00:00'),
      endDate: toDateTimeLocalInput(setting.endDate, '23:59:59'),
      description: setting.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingSettingId(null);
  };

  return (
    <>
      <Head>
        <title>Playground Settings - Admin - HUB ACADEMY</title>
      </Head>

      <div className="relative h-screen bg-background overflow-hidden">
        <AnimatedNoise opacity={0.03} />

        <div className="relative z-10 h-full">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="h-full flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-border/30">
                <div className="flex items-center gap-2 px-6 md:px-12">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider">
                          Playground Settings
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto">
                {/* Hero Section */}
                <section className="relative px-6 md:px-12 pt-4 md:pt-6 pb-4">
                  <div className="max-w-7xl mx-auto">
                    <h1
                      className="font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight text-foreground mb-0.5"
                      style={{ fontStyle: 'italic' }}
                    >
                      PLAYGROUND SETTINGS
                    </h1>
                    <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                      Configure Playground Information
                    </p>
                  </div>
                </section>

                {/* Main Content: Two Column Layout */}
                <section className="px-6 md:px-12 py-4 md:py-6">
                  <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column: Settings History */}
                      <div className="space-y-4">
                        <div>
                          <h2
                            className="font-[var(--font-bebas)] text-xl tracking-tight text-foreground mb-1"
                            style={{ fontStyle: 'italic' }}
                          >
                            SETTINGS HISTORY
                          </h2>
                          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                            Previously Saved Configurations
                          </p>
                        </div>

                        {settingsHistory.length === 0 ? (
                          <div className="border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 p-6 text-center">
                            <p className="font-mono text-sm text-muted-foreground">
                              No saved settings yet. Save your first
                              configuration to see it here.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                            {settingsHistory.map((setting) => (
                              <div
                                key={setting.id}
                                className={`w-full border rounded-lg backdrop-blur-sm bg-background/40 p-4 transition-all duration-200 group ${
                                  setting.isActive
                                    ? 'border-accent/50 bg-accent/5'
                                    : 'border-border/30 hover:border-accent/50 hover:bg-background/60'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {setting.isActive && (
                                        <span className="font-mono text-[9px] text-accent uppercase tracking-wider px-2 py-0.5 border border-accent/30 rounded bg-accent/10">
                                          ACTIVE
                                        </span>
                                      )}
                                      <span className="font-mono text-sm font-semibold text-foreground">
                                        {setting.codeName}
                                      </span>
                                      <span className="font-mono text-xs text-muted-foreground">
                                        ({setting.name})
                                      </span>
                                      <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider px-2 py-0.5 border border-border/30 rounded">
                                        {setting.type}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className="font-mono">
                                        Season: {setting.season}
                                      </span>
                                      {setting.startDate && setting.endDate && (
                                        <span className="font-mono">
                                          {new Date(
                                            setting.startDate
                                          ).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                          })}{' '}
                                          -{' '}
                                          {new Date(
                                            setting.endDate
                                          ).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                                      Saved
                                    </p>
                                    <p className="font-mono text-xs text-foreground">
                                      {new Date(
                                        setting.updatedAt
                                      ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </p>
                                    <p className="font-mono text-[9px] text-muted-foreground">
                                      {new Date(
                                        setting.updatedAt
                                      ).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditSetting(setting);
                                    }}
                                    className="flex-1 font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-border/30 rounded hover:border-accent/50 hover:bg-background/60 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSetting(setting);
                                      setIsDetailOpen(true);
                                    }}
                                    className="flex-1 font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-border/30 rounded hover:border-accent/50 hover:bg-background/60 transition-colors"
                                  >
                                    View Details
                                  </button>
                                  {!setting.isActive && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetActive(setting.id);
                                      }}
                                      className="flex-1 font-mono text-xs uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground"
                                    >
                                      Set as Active
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Settings Form */}
                      <div className="space-y-4">
                        <div>
                          <h2
                            className="font-[var(--font-bebas)] text-xl tracking-tight text-foreground mb-1"
                            style={{ fontStyle: 'italic' }}
                          >
                            {editingSettingId
                              ? 'EDIT SETTINGS'
                              : 'CONFIGURE SETTINGS'}
                          </h2>
                          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                            {editingSettingId
                              ? 'Update Existing Playground Configuration'
                              : 'Create or Update Playground Configuration'}
                          </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                          <Tabs
                            value={activeFormTab}
                            onValueChange={(value) =>
                              setActiveFormTab(
                                value as 'basic' | 'schedule' | 'badge'
                              )
                            }
                            className="w-full"
                          >
                            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-background/40 border border-border/30 p-1 gap-0 w-auto">
                              <TabsTrigger
                                value="basic"
                                className="font-mono text-[10px] uppercase tracking-wider"
                              >
                                Basic
                              </TabsTrigger>
                              <TabsTrigger
                                value="schedule"
                                className="font-mono text-[10px] uppercase tracking-wider"
                              >
                                Schedule
                              </TabsTrigger>
                              <TabsTrigger
                                value="badge"
                                className="font-mono text-[10px] uppercase tracking-wider"
                              >
                                Badge
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent
                              value="basic"
                              className="mt-4 space-y-4"
                            >
                              <div className="space-y-2">
                                <Label
                                  htmlFor="name"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Playground Name
                                </Label>
                                <Input
                                  id="name"
                                  type="text"
                                  value={formData.name}
                                  onChange={(e) =>
                                    handleChange('name', e.target.value)
                                  }
                                  placeholder="e.g., Recruiting Playground"
                                  className="font-mono text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="codeName"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Code Name
                                </Label>
                                <Input
                                  id="codeName"
                                  type="text"
                                  value={formData.codeName}
                                  onChange={(e) =>
                                    handleChange('codeName', e.target.value)
                                  }
                                  placeholder="e.g., BREEZY"
                                  className="font-mono text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="description"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Description
                                </Label>
                                <textarea
                                  id="description"
                                  value={formData.description}
                                  onChange={(e) =>
                                    handleChange('description', e.target.value)
                                  }
                                  placeholder="Playground description..."
                                  rows={4}
                                  className="w-full px-3 py-2 border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors"
                                />
                              </div>
                            </TabsContent>

                            <TabsContent
                              value="schedule"
                              className="mt-4 space-y-4"
                            >
                              <div className="space-y-2">
                                <Label
                                  htmlFor="season"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Season
                                </Label>
                                <Input
                                  id="season"
                                  type="text"
                                  value={formData.season}
                                  onChange={(e) =>
                                    handleChange('season', e.target.value)
                                  }
                                  placeholder="e.g., MAR-JUN 2026, Season 1"
                                  className="font-mono text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="type"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Playground Type
                                </Label>
                                <Select
                                  value={formData.type}
                                  onValueChange={(value) =>
                                    handleChange('type', value)
                                  }
                                >
                                  <SelectTrigger className="font-mono text-sm">
                                    <SelectValue placeholder="Select playground type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="beta">Beta</SelectItem>
                                    <SelectItem value="recruiting">
                                      Recruiting
                                    </SelectItem>
                                    <SelectItem value="regular">
                                      Regular
                                    </SelectItem>
                                    <SelectItem value="special">
                                      Special
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label
                                    htmlFor="startDate"
                                    className="font-mono text-xs uppercase tracking-wider"
                                  >
                                    Start DateTime
                                  </Label>
                                  <Input
                                    id="startDate"
                                    type="datetime-local"
                                    step={1}
                                    value={formData.startDate}
                                    onChange={(e) =>
                                      handleChange('startDate', e.target.value)
                                    }
                                    className="font-mono text-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label
                                    htmlFor="endDate"
                                    className="font-mono text-xs uppercase tracking-wider"
                                  >
                                    End DateTime
                                  </Label>
                                  <Input
                                    id="endDate"
                                    type="datetime-local"
                                    step={1}
                                    value={formData.endDate}
                                    onChange={(e) =>
                                      handleChange('endDate', e.target.value)
                                    }
                                    className="font-mono text-sm"
                                  />
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent
                              value="badge"
                              className="mt-4 space-y-4"
                            >
                              <div className="space-y-2">
                                <Label
                                  htmlFor="badgeName"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Badge Name (linked by CODENAME)
                                </Label>
                                <Input
                                  id="badgeName"
                                  type="text"
                                  value={formData.badgeName}
                                  onChange={(e) =>
                                    handleChange('badgeName', e.target.value)
                                  }
                                  placeholder="e.g., Recruiting CTF"
                                  className="font-mono text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="badgeImage"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Badge Image URL
                                </Label>
                                <Input
                                  id="badgeImage"
                                  type="text"
                                  value={formData.badgeImage}
                                  onChange={(e) =>
                                    handleChange('badgeImage', e.target.value)
                                  }
                                  placeholder="https://.../recruiting-ctf.png"
                                  className="font-mono text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="badgeDescription"
                                  className="font-mono text-xs uppercase tracking-wider"
                                >
                                  Badge Description
                                </Label>
                                <textarea
                                  id="badgeDescription"
                                  value={formData.badgeDescription}
                                  onChange={(e) =>
                                    handleChange(
                                      'badgeDescription',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Badge description shown on the badge page..."
                                  rows={3}
                                  className="w-full px-3 py-2 border border-border/30 rounded-lg backdrop-blur-sm bg-background/40 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors"
                                />
                              </div>
                            </TabsContent>
                          </Tabs>

                          {/* Action Buttons */}
                          <div className="pt-4 flex items-center gap-3">
                            <Button
                              type="submit"
                              disabled={loading}
                              className="font-mono text-xs uppercase tracking-wider bg-accent hover:bg-accent/90 text-foreground"
                            >
                              {loading
                                ? 'Saving...'
                                : editingSettingId
                                  ? 'Update Settings'
                                  : 'Save Settings'}
                            </Button>
                            {editingSettingId && (
                              <Button
                                type="button"
                                onClick={handleCancelEdit}
                                variant="outline"
                                className="font-mono text-xs uppercase tracking-wider"
                              >
                                Cancel Edit
                              </Button>
                            )}
                            <Button
                              type="button"
                              onClick={() => setIsPreviewOpen(true)}
                              variant="outline"
                              className="font-mono text-xs uppercase tracking-wider"
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              Preview
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>

      {/* Settings Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-xl border-border/30 bg-background/50 backdrop-blur-sm p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-[var(--font-bebas)] text-3xl tracking-tight text-foreground mb-2">
              SETTINGS DETAIL
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              {selectedSetting && (
                <>
                  Saved on{' '}
                  {new Date(selectedSetting.updatedAt).toLocaleString('en-US')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedSetting && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                    Playground Name
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {selectedSetting.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                    Code Name
                  </p>
                  <p className="font-mono text-sm text-accent font-semibold">
                    {selectedSetting.codeName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                    Season
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {selectedSetting.season}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                    Type
                  </p>
                  <p className="font-mono text-sm text-foreground uppercase">
                    {selectedSetting.type}
                  </p>
                </div>
                {selectedSetting.startDate && (
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                      Start Date
                    </p>
                    <p className="font-mono text-sm text-foreground">
                      {new Date(selectedSetting.startDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  </div>
                )}
                {selectedSetting.endDate && (
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                      End Date
                    </p>
                    <p className="font-mono text-sm text-foreground">
                      {new Date(selectedSetting.endDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  </div>
                )}
              </div>
              {selectedSetting.description && (
                <div className="space-y-1 pt-2 border-t border-border/20">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
                    Description
                  </p>
                  <p className="font-mono text-xs text-foreground/80 whitespace-pre-wrap">
                    {selectedSetting.description}
                  </p>
                </div>
              )}
              {(selectedSetting.badgeName ||
                selectedSetting.badgeImage ||
                selectedSetting.badgeDescription) && (
                <div className="space-y-2 pt-2 border-t border-border/20">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                    Badge Mapping
                  </p>
                  {selectedSetting.badgeName && (
                    <p className="font-mono text-xs text-foreground/90">
                      Name: {selectedSetting.badgeName}
                    </p>
                  )}
                  {selectedSetting.badgeImage && (
                    <p className="font-mono text-xs text-foreground/90 break-all">
                      Image: {selectedSetting.badgeImage}
                    </p>
                  )}
                  {selectedSetting.badgeDescription && (
                    <p className="font-mono text-xs text-foreground/80 whitespace-pre-wrap">
                      {selectedSetting.badgeDescription}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/30">
            <DialogTitle className="font-mono text-sm uppercase tracking-wider">
              Playground Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto h-[calc(95vh-80px)]">
            <PlaygroundPreview settings={formData} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

AdminPlayground.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default AdminPlayground;
