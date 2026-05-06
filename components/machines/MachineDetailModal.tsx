import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Square,
  Play,
  Download,
  Folder,
  Key,
  ChevronDown,
  Hash,
} from 'lucide-react';

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
  attachmentUrl: string | null;
  solvedCount: number;
  firstBlood?: string;
  lastSolved?: string;
  createdAt: string;
  updatedAt: string;
}

interface MachineDetailResponse {
  data: {
    machine: MachineDetail;
  };
}

interface ContainerInstance {
  id: string;
  ipAddress: string;
  ports: Record<string, number>;
  status: 'running' | 'stopped';
  createdAt: string;
}

interface ContainerResponse {
  data: {
    instance?: ContainerInstance;
    message?: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MachineDetailModalProps {
  machineId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineDetailModal({ machineId, open, onOpenChange }: MachineDetailModalProps) {
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<MachineDetailResponse>(
    machineId ? `/api/machines/${machineId}` : null,
    fetcher
  );
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [startingContainer, setStartingContainer] = useState(false);
  const [stoppingContainer, setStoppingContainer] = useState(false);
  const [showHashModal, setShowHashModal] = useState(false);
  const [hashInfo, setHashInfo] = useState<{ sha256: string; size: number } | null>(null);
  const [loadingHash, setLoadingHash] = useState(false);

  const handleShowHash = async () => {
    if (!machineId) return;
    setShowHashModal(true);
    if (hashInfo) return;
    setLoadingHash(true);
    try {
      const response = await fetch(`/api/machines/${machineId}/hash`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Hash 계산 실패');
      setHashInfo(result.data);
    } catch (error: any) {
      toast.error(error.message || 'Hash 계산 실패');
      setShowHashModal(false);
    } finally {
      setLoadingHash(false);
    }
  };

  // 컨테이너 인스턴스 조회 (사용자별)
  const { data: containerData, mutate: mutateContainer } = useSWR<ContainerResponse>(
    machineId && session ? `/api/machines/${machineId}/container` : null,
    fetcher
  );

  const machine = data?.data?.machine;
  const container = containerData?.data?.instance;

  // 시도 횟수 조회 (임시로 0으로 설정, 실제로는 API에서 가져와야 함)
  const attemptCount = 0;

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || !machineId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/machines/${machineId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: flag.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to submit flag');
      }

      if (result.data.isCorrect) {
        toast.success(
          result.data.isFirstBlood
            ? `First Blood! 🩸 +${result.data.earnedPoints} points (${result.data.bloodBonus} bonus)`
            : `Correct! +${result.data.earnedPoints} points`,
          { duration: 5000 }
        );
        setFlag('');
        mutate();
      } else {
        toast.error(result.data.message || 'Incorrect flag');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit flag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartContainer = async () => {
    if (!machineId || !session) return;

    setStartingContainer(true);
    try {
      const response = await fetch(`/api/machines/${machineId}/container`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to start container');
      }

      toast.success('Container started successfully');
      mutateContainer();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start container');
    } finally {
      setStartingContainer(false);
    }
  };

  const handleStopContainer = async () => {
    if (!machineId || !container) return;

    setStoppingContainer(true);
    try {
      const response = await fetch(`/api/machines/${machineId}/container`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: container.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to stop container');
      }

      toast.success('Container stopped successfully');
      mutateContainer();
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop container');
    } finally {
      setStoppingContainer(false);
    }
  };

  const getCategoryColor = (category: string | undefined | null) => {
    if (!category) {
      return 'bg-accent';
    }
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('misc')) {
      return 'bg-green-500';
    } else if (categoryLower.includes('crypto')) {
      return 'bg-purple-500';
    } else if (categoryLower.includes('pwn')) {
      return 'bg-red-500';
    } else if (categoryLower.includes('web')) {
      return 'bg-blue-500';
    } else if (categoryLower.includes('revers') || categoryLower.includes('reverse')) {
      return 'bg-yellow-500';
    } else if (categoryLower.includes('forensic')) {
      return 'bg-purple-300';
    } else if (categoryLower.includes('hardware')) {
      return 'bg-white';
    }
    return 'bg-accent';
  };

  if (!open || !machineId) return null;

  const colorClass = getCategoryColor(machine?.category);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border/30">
        {isLoading ? (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-muted-foreground">Loading challenge details...</p>
          </div>
        ) : error || !machine ? (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-destructive">Failed to load challenge details</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-foreground">
                  {machine.title}
                </h1>
                <div className="text-lg font-semibold text-foreground">
                  {machine.score} pts
                </div>
              </div>
              <div className={`h-0.5 w-full ${colorClass}`}></div>
            </div>

            {/* Description */}
            {machine.description && (
              <div className="border-l-2 border-border/50 pl-3 prose prose-invert prose-sm max-w-none
                prose-p:text-muted-foreground prose-p:my-1
                prose-strong:text-foreground
                prose-code:text-accent prose-code:bg-muted/40 prose-code:px-1 prose-code:rounded
                prose-headings:text-foreground prose-headings:font-mono
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-hr:border-border/30">
                <ReactMarkdown>{machine.description}</ReactMarkdown>
              </div>
            )}

            {/* Instance Management Section */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground mb-1">
                    This challenge requires creating an instance
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Instance will live for 120 mins.
                  </p>
                </div>
                {container && container.status === 'running' ? (
                  <Button
                    onClick={handleStopContainer}
                    disabled={stoppingContainer}
                    className="bg-accent hover:bg-accent/90 text-foreground border border-accent/50 px-4 py-2"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {stoppingContainer ? 'Stopping...' : 'Stop'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartContainer}
                    disabled={startingContainer}
                    className="bg-accent hover:bg-accent/90 text-foreground border border-accent/50 px-4 py-2"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {startingContainer ? 'Creating...' : 'Create'}
                  </Button>
                )}
              </div>
              {/* Gray Line */}
              <div className="h-px w-full bg-border/30"></div>
            </div>

            {/* File Download Section */}
            <div className="space-y-3">
              {machine.attachmentUrl ? (
                // File exists - Show file info with download button
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Folder Icon */}
                    <div className="w-12 h-12 rounded bg-background/60 border border-border/50 flex items-center justify-center">
                      <Folder className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        {machine.attachmentUrl.split('/').pop() || 'attachment.zip'}
                      </p>
                      <p className="text-xs text-muted-foreground">2 KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      className="bg-accent hover:bg-accent/90 text-foreground px-4 py-2 rounded-md flex items-center gap-2 border border-accent/50"
                    >
                      <a href={`/api/machines/${machineId}/download`}>
                        Download Files
                        <ChevronDown className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 bg-background/60 border border-border/50"
                      onClick={handleShowHash}
                      title="SHA256 Hash"
                    >
                      <Key className="h-4 w-4 text-foreground" />
                    </Button>
                  </div>
                </div>
              ) : (
                // No file - Show "No File." message
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Folder Icon (open) */}
                    <div className="w-12 h-12 rounded bg-background/60 border border-border/50 flex items-center justify-center">
                      <Folder className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">No File.</p>
                      <p className="text-xs text-muted-foreground">0kb</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled
                      className="bg-accent/50 hover:bg-accent/50 text-foreground/50 px-4 py-2 rounded-md flex items-center gap-2 cursor-not-allowed border border-accent/30"
                    >
                      Download Files
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 bg-background/60 border border-border/50"
                    >
                      <Key className="h-4 w-4 text-foreground" />
                    </Button>
                  </div>
                </div>
              )}
              {/* Gray Line */}
              <div className="h-px w-full bg-border/30"></div>
            </div>

            {/* Flag Submission Section */}
            {session && (
              <div className="space-y-3">
                <p className="text-base text-foreground">
                  You've tried {attemptCount} times already!
                </p>
                <form onSubmit={handleSubmitFlag} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="HUB{...}"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    className="flex-1 h-11 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground"
                    disabled={submitting}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={submitting || !flag.trim()}
                    className="bg-accent hover:bg-accent/90 text-foreground border border-accent/50 px-4 py-2 h-11"
                  >
                    {submitting ? 'Submitting...' : 'Submit Flag'}
                  </Button>
                </form>
              </div>
            )}

            {/* Container Info (if running) */}
            {container && container.status === 'running' && (
              <div className="p-4 border border-border/30 rounded-lg bg-background/40">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">IP Address:</span>
                    <code className="text-sm font-mono font-bold text-foreground">{container.ipAddress}</code>
                  </div>
                  {Object.entries(container.ports).map(([name, port]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Port:</span>
                      <code className="text-sm font-mono font-bold text-foreground">{port}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* SHA256 Hash Modal */}

    <Dialog open={showHashModal} onOpenChange={setShowHashModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Hash className="h-4 w-4" />
            File Hash
          </DialogTitle>
          <DialogDescription>문제 파일의 무결성을 확인하세요.</DialogDescription>
        </DialogHeader>
        {loadingHash ? (
          <p className="font-mono text-sm text-muted-foreground py-4 text-center">Computing hash...</p>
        ) : hashInfo ? (
          <div className="space-y-3">
            <div>
              <p className="font-mono text-xs text-muted-foreground mb-1 uppercase tracking-wider">SHA256</p>
              <code className="block w-full break-all bg-muted/40 px-3 py-2 rounded text-xs font-mono text-foreground select-all">
                {hashInfo.sha256}
              </code>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Size: {(hashInfo.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
