/* eslint-disable i18next/no-literal-string */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WriteupsTabProps {
  gameId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WriteupsTab({ gameId: _gameId }: WriteupsTabProps) {
  const [selectedTeam, setSelectedTeam] = useState('all');

  return (
    <div className="space-y-6">
      {/* Top Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="font-mono w-40">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem value="team1">Team 1</SelectItem>
            <SelectItem value="team2">Team 2</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="font-mono text-sm bg-accent hover:bg-accent/90 text-foreground"
        >
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      {/* Empty State */}
      <div className="text-center py-20">
        <p className="font-mono text-lg font-semibold text-foreground mb-2">
          <strong>Ouch! No writeup yet</strong>
        </p>
        <p className="font-mono text-sm text-muted-foreground">
          New writeups will appear here
        </p>
      </div>
    </div>
  );
}
