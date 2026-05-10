/* eslint-disable i18next/no-literal-string */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Briefcase, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface InformationTabProps {
  gameId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function InformationTab({ gameId: _gameId }: InformationTabProps) {
  const [maxTeamMember, setMaxTeamMember] = useState('0');
  const [teamContainerLimit, setTeamContainerLimit] = useState('3');
  const [invitationCode, setInvitationCode] = useState('');
  const [gameDetails, setGameDetails] = useState('');
  const [, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  const handleGenerateInvitationCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setInvitationCode(code);
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Please select an image less than 3MB');
        return;
      }
      setPoster(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPosterPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      // TODO: API 호출
      toast.success('Changes saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save changes');
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
          <Download className="h-4 w-4 mr-2" />
          Export Game
        </Button>
        <Button
          variant="outline"
          className="font-mono text-sm bg-accent hover:bg-accent/90 text-foreground"
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Copy Public Key
        </Button>
        <Button
          onClick={handleSave}
          className="font-mono text-sm bg-accent hover:bg-accent/90 text-foreground"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Configuration Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Maximum Team Member */}
        <div className="space-y-2">
          <Label htmlFor="maxTeamMember" className="font-mono text-sm font-semibold">
            Maximum Team Member <span className="text-destructive">*</span>
          </Label>
          <p className="font-mono text-xs text-muted-foreground">
            0 means unlimited members of team
          </p>
          <div className="relative">
            <Input
              id="maxTeamMember"
              type="number"
              value={maxTeamMember}
              onChange={(e) => setMaxTeamMember(e.target.value)}
              className="font-mono pr-10"
              min="0"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setMaxTeamMember(String(Math.max(0, parseInt(maxTeamMember) + 1)))}
                className="h-3 w-4 flex items-center justify-center text-xs hover:bg-background/60 rounded"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => setMaxTeamMember(String(Math.max(0, parseInt(maxTeamMember) - 1)))}
                className="h-3 w-4 flex items-center justify-center text-xs hover:bg-background/60 rounded"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Team Container Limit */}
        <div className="space-y-2">
          <Label htmlFor="teamContainerLimit" className="font-mono text-sm font-semibold">
            Team Container Limit <span className="text-destructive">*</span>
          </Label>
          <p className="font-mono text-xs text-muted-foreground">
            Containers shared by one team (0 = unlimited)
          </p>
          <div className="relative">
            <Input
              id="teamContainerLimit"
              type="number"
              value={teamContainerLimit}
              onChange={(e) => setTeamContainerLimit(e.target.value)}
              className="font-mono pr-10"
              min="0"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setTeamContainerLimit(String(Math.max(0, parseInt(teamContainerLimit) + 1)))}
                className="h-3 w-4 flex items-center justify-center text-xs hover:bg-background/60 rounded"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => setTeamContainerLimit(String(Math.max(0, parseInt(teamContainerLimit) - 1)))}
                className="h-3 w-4 flex items-center justify-center text-xs hover:bg-background/60 rounded"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Invitation Code */}
        <div className="space-y-2">
          <Label htmlFor="invitationCode" className="font-mono text-sm font-semibold">
            Invitation Code
          </Label>
          <p className="font-mono text-xs text-muted-foreground">
            Can be overwritten by divisions
          </p>
          <div className="relative">
            <Input
              id="invitationCode"
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder="Leave empty to disable"
              className="font-mono pr-10"
            />
            <button
              type="button"
              onClick={handleGenerateInvitationCode}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-background/60 rounded"
              title="Generate random code"
            >
              <span className="text-lg">🎲</span>
            </button>
          </div>
        </div>
      </div>

      {/* Game Details and Poster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Details */}
        <div className="space-y-2">
          <Label htmlFor="gameDetails" className="font-mono text-sm font-semibold">
            Game Details
          </Label>
          <p className="font-mono text-xs text-muted-foreground">
            Styling with Markdown is supported
          </p>
          <Textarea
            id="gameDetails"
            value={gameDetails}
            onChange={(e) => setGameDetails(e.target.value)}
            placeholder="Enter game details..."
            className="font-mono min-h-[300px]"
          />
        </div>

        {/* Poster */}
        <div className="space-y-2">
          <Label className="font-mono text-sm font-semibold">
            Poster
          </Label>
          <div
            className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 transition-colors bg-background/40"
            onClick={() => document.getElementById('poster-upload')?.click()}
          >
            <input
              id="poster-upload"
              type="file"
              accept="image/*"
              onChange={handlePosterChange}
              className="hidden"
            />
            {posterPreview ? (
              <div className="space-y-2">
                <img
                  src={posterPreview}
                  alt="Poster preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
                <p className="font-mono text-xs text-muted-foreground">
                  Click to change image
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-mono text-sm text-foreground">
                  Drag and drop an image or click here to select poster
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Please select an image less than 3MB
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
