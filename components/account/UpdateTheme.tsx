import { ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import useTheme from 'hooks/useTheme';
import { useTranslation } from 'next-i18next';

const UpdateTheme = () => {
  const { setTheme, themes, selectedTheme, applyTheme } = useTheme();
  const { t } = useTranslation('common');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-1">
          {t('theme')}
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          {t('change-theme')}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full md:w-60 justify-between font-mono text-sm"
          >
            <div className="flex items-center gap-2">
              <selectedTheme.icon className="w-4 h-4" />
              {selectedTheme.name}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full md:w-60 font-mono text-sm">
          {themes.map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => {
                applyTheme(theme.id);
                setTheme(theme.id);
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <theme.icon className="w-4 h-4" />
                {theme.name}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UpdateTheme;
