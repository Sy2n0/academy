/* eslint-disable i18next/no-literal-string */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Hexagon, Puzzle, FileText, Bomb } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useRouter } from 'next/router';

interface MachinesTabProps {
  gameId: string;
}

interface Machine {
  id: string;
  title: string;
  category: string;
  type: string;
  score: number;
  solvedCount: number;
  isActive: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MachinesTab({ gameId: _gameId }: MachinesTabProps) {
  const router = useRouter();
  const [isNewChallengeOpen, setIsNewChallengeOpen] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeCategory, setNewChallengeCategory] = useState('');
  const [newChallengeType, setNewChallengeType] = useState('');

  const { data, error, isLoading, mutate } = useSWR<{
    data: { machines: Machine[] };
  }>('/api/admin/machines/active', fetcher);

  const machines = data?.data?.machines || [];

  const handleNewChallenge = async () => {
    if (!newChallengeTitle || !newChallengeCategory || !newChallengeType) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/machines/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newChallengeTitle,
          category: newChallengeCategory,
          type: newChallengeType,
          score: 1000,
          difficultyFactor: 5.0,
          minimumScoreRatio: 20,
          bloodBonus: false,
          maxAttempts: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create challenge');
      }

      toast.success('Challenge created successfully');
      setIsNewChallengeOpen(false);
      setNewChallengeTitle('');
      setNewChallengeCategory('');
      setNewChallengeType('');
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create challenge');
    }
  };

  const handleEditMachine = (machine: Machine) => {
    router.push(`/admin/machines/active/${machine.id}/edit`);
  };

  const handleToggleActive = async (machine: Machine, checked: boolean) => {
    try {
      const response = await fetch(`/api/admin/machines/active/${machine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: checked }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Failed to update machine status'
        );
      }

      toast.success(
        `Machine ${checked ? 'activated' : 'deactivated'} successfully`
      );
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update machine status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          className="font-mono text-sm bg-accent hover:bg-accent/90 text-foreground"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Scoreboard
        </Button>
        <Button
          variant="outline"
          className="font-mono text-sm bg-accent hover:bg-accent/90 text-foreground"
        >
          <Hexagon className="h-4 w-4 mr-2" />
          Triple Blood Bonus
        </Button>
        <Button
          onClick={() => setIsNewChallengeOpen(true)}
          className="font-mono text-sm bg-accent hover:bg-accent/90 text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />+ New Challenge
        </Button>
      </div>

      {/* Machines List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-muted-foreground">
            Loading challenges...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-destructive">
            Failed to load challenges
          </p>
        </div>
      ) : machines.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-mono text-lg font-semibold text-foreground mb-2">
            <strong>Ouch! This game has no challenge yet.</strong>
          </p>
          <p className="font-mono text-sm text-muted-foreground">
            Click the top right to create the first challenge
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine) => {
            // 카테고리별 색상 매핑
            const getCategoryColor = (category: string) => {
              const categoryLower = category.toLowerCase();
              if (categoryLower.includes('misc')) {
                return {
                  icon: 'text-green-500',
                  progress: 'bg-green-500',
                  button: 'text-green-500',
                };
              } else if (categoryLower.includes('crypto')) {
                return {
                  icon: 'text-purple-500',
                  progress: 'bg-purple-500',
                  button: 'text-purple-500',
                };
              } else if (categoryLower.includes('pwn')) {
                return {
                  icon: 'text-red-500',
                  progress: 'bg-red-500',
                  button: 'text-red-500',
                };
              } else if (categoryLower.includes('web')) {
                return {
                  icon: 'text-blue-500',
                  progress: 'bg-blue-500',
                  button: 'text-blue-500',
                };
              } else if (
                categoryLower.includes('revers') ||
                categoryLower.includes('reverse')
              ) {
                return {
                  icon: 'text-yellow-500',
                  progress: 'bg-yellow-500',
                  button: 'text-yellow-500',
                };
              } else if (categoryLower.includes('forensic')) {
                return {
                  icon: 'text-purple-300',
                  progress: 'bg-purple-300',
                  button: 'text-purple-300',
                };
              } else if (categoryLower.includes('hardware')) {
                return {
                  icon: 'text-white',
                  progress: 'bg-white',
                  button: 'text-white',
                };
              }
              // 기본값
              return {
                icon: 'text-accent',
                progress: 'bg-accent',
                button: 'text-accent',
              };
            };

            const colors = getCategoryColor(machine.category);

            return (
              <div
                key={machine.id}
                className="group relative bg-background/40 border border-border/30 rounded-lg hover:bg-background/60 transition-all duration-200 overflow-hidden"
              >
                {/* Progress Bar at Bottom */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 ${colors.progress}`}
                ></div>

                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <Switch
                      className="flex-shrink-0"
                      checked={machine.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleActive(machine, checked)
                      }
                    />

                    {/* Bomb Icon */}
                    <div className="flex-shrink-0">
                      <Bomb className={`h-5 w-5 ${colors.icon}`} />
                    </div>

                    {/* Title and Score */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-sm font-semibold text-foreground truncate mb-0.5">
                        {machine.title}
                      </h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        {machine.score}/{machine.score}pts
                      </p>
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMachine(machine)}
                        className={`font-mono text-xs h-7 w-7 p-0 ${colors.button} hover:bg-background/60`}
                      >
                        <Puzzle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`font-mono text-xs h-7 w-7 p-0 ${colors.button} hover:bg-background/60`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Challenge Modal */}
      <Dialog open={isNewChallengeOpen} onOpenChange={setIsNewChallengeOpen}>
        <DialogContent className="sm:max-w-md rounded-xl border-border/30 bg-background/50 backdrop-blur-sm">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-mono text-lg font-semibold">
                New Challenge
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNewChallengeOpen(false)}
                className="h-8 w-8 p-0 text-accent hover:text-accent"
              >
                ✕
              </Button>
            </div>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              Create a new challenge for this game
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="font-mono text-sm font-semibold"
              >
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={newChallengeTitle}
                onChange={(e) => setNewChallengeTitle(e.target.value)}
                placeholder="Title"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="category"
                className="font-mono text-sm font-semibold"
              >
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newChallengeCategory}
                onValueChange={setNewChallengeCategory}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pwn">Pwn</SelectItem>
                  <SelectItem value="Web">Web</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="Reverse">Reverse</SelectItem>
                  <SelectItem value="Forensics">Forensics</SelectItem>
                  <SelectItem value="Misc">Misc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="font-mono text-sm font-semibold">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newChallengeType}
                onValueChange={setNewChallengeType}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue placeholder="Type" />
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
              <p className="font-mono text-xs text-muted-foreground">
                Cannot be changed after creation
              </p>
            </div>
            <Button
              onClick={handleNewChallenge}
              className="w-full font-mono text-sm bg-accent hover:bg-accent/90 text-foreground"
            >
              New Challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
