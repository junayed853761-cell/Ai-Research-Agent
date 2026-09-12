import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '../lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1 border border-border">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "p-1.5 rounded-full transition-all",
          theme === 'light' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        title="Light Mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "p-1.5 rounded-full transition-all",
          theme === 'dark' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          "p-1.5 rounded-full transition-all",
          theme === 'system' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        title="System Preference"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
