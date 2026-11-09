'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon, Laptop } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-8 w-8 rounded-lg border border-border/60 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer"
        title="Toggle theme"
      >
        {resolvedTheme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 p-1">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="text-xs gap-2 cursor-pointer"
        >
          <Sun size={14} />
          <span>Light</span>
          {theme === 'light' && <span className="ml-auto text-[10px] text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="text-xs gap-2 cursor-pointer"
        >
          <Moon size={14} />
          <span>Dark</span>
          {theme === 'dark' && <span className="ml-auto text-[10px] text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="text-xs gap-2 cursor-pointer"
        >
          <Laptop size={14} />
          <span>System</span>
          {theme === 'system' && <span className="ml-auto text-[10px] text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
