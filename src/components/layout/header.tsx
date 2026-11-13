'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIssueModal } from '@/context/issue-modal-context';
import { useCommandPalette } from '@/context/command-palette-context';
import { useProjects } from '@/hooks/use-issues';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  ChevronRight,
  FolderKanban,
} from 'lucide-react';

interface HeaderProps {
  projectKey?: string;
  projectName?: string;
}

export function Header({ projectKey = 'TYK', projectName }: HeaderProps) {
  const pathname = usePathname();
  const { openCreateModal } = useIssueModal();
  const { openPalette } = useCommandPalette();
  const { data: projects = [] } = useProjects();

  const isProjectsListPage = pathname === '/projects' || pathname === '/projects/';

  const urlProjectKey = pathname?.match(/\/projects\/([^/]+)/)?.[1] || projectKey;
  const currentProject = projects.find(
    (p) => p.key?.toUpperCase() === urlProjectKey?.toUpperCase() || p.id === urlProjectKey
  );
  const resolvedProjectKey = currentProject?.key || urlProjectKey;
  const resolvedProjectName =
    currentProject?.name || projectName || (resolvedProjectKey === 'TYK' ? 'Tykket' : resolvedProjectKey);

  // Determine current active view title from pathname
  const currentView = pathname?.includes('/backlog')
    ? 'Backlog'
    : pathname?.includes('/reports')
    ? 'Reports & Metrics'
    : pathname?.includes('/trash')
    ? 'Trash Bin'
    : pathname?.includes('/settings')
    ? 'Settings'
    : 'Board';

  return (
    <header className="h-14 border-b border-border/70 bg-card/40 backdrop-blur-md px-6 flex items-center justify-between gap-4 shrink-0 z-10 select-none">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        <Link
          href="/projects"
          className={cn(
            'flex items-center gap-1.5 transition-colors font-medium hover:text-foreground',
            isProjectsListPage && 'font-semibold text-foreground'
          )}
        >
          <FolderKanban size={15} className="text-primary shrink-0" />
          <span>Projects</span>
        </Link>

        {isProjectsListPage ? (
          <>
            <ChevronRight size={14} className="text-muted-foreground/60 shrink-0" />
            <span className="font-semibold text-foreground px-2 py-0.5 rounded bg-muted text-xs">
              All Projects
            </span>
          </>
        ) : (
          <>
            <ChevronRight size={14} className="text-muted-foreground/60 shrink-0" />
            <Link
              href={`/projects/${resolvedProjectKey}/board`}
              className="font-semibold text-foreground hover:underline underline-offset-2 truncate"
            >
              {resolvedProjectName}
            </Link>
            <ChevronRight size={14} className="text-muted-foreground/60 shrink-0" />
            <span className="font-semibold text-foreground px-2 py-0.5 rounded bg-muted text-xs">
              {currentView}
            </span>
          </>
        )}
      </nav>

      {/* Global Search and Actions */}
      <div className="flex items-center gap-3">
        {/* Search Trigger Button (Opens Command Palette) */}
        <button
          type="button"
          onClick={openPalette}
          className="relative hidden sm:flex items-center justify-between w-64 md:w-80 h-8 px-3 rounded-md bg-muted/30 hover:bg-muted/60 border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate">Search issues, keys...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-muted border border-border/60 px-1.5 py-0.5 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Theme Mode Switcher */}
        <ThemeToggle />

        {/* Create Issue CTA */}
        <Button
          type="button"
          size="sm"
          onClick={() => openCreateModal()}
          className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>Create Issue</span>
          <kbd className="hidden md:inline text-[9px] font-mono bg-primary-foreground/20 px-1 rounded text-primary-foreground">
            C
          </kbd>
        </Button>
      </div>
    </header>
  );
}
