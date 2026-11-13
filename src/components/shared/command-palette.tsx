'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useIssues, useProjectMembers } from '@/hooks/use-issues';
import { Issue } from '@/types/issue';
import { useIssueModal } from '@/context/issue-modal-context';
import { useCommandPalette } from '@/context/command-palette-context';
import { useTheme } from '@/components/theme/theme-provider';
import { IssueTypeIcon } from '@/components/issues/issue-type-icon';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  ListTree,
  Settings,
  Trash2,
  Plus,
  FolderPlus,
  Moon,
  Sun,
  User,
  BarChart3,
} from 'lucide-react';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';

export function GlobalCommandPalette({ projectKey = 'TYK' }: { projectKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, closePalette } = useCommandPalette();
  const { openCreateModal, openEditModal } = useIssueModal();
  const { theme, setTheme } = useTheme();

  const activeProjectKey = pathname?.match(/\/projects\/([^/]+)/)?.[1] || projectKey;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Debounce search input for instant snappy filtering
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(handler);
  }, [search]);

  // Load issues and members from live API
  const { data: issues = [] } = useIssues(activeProjectKey);
  const { data: projectMembers = [] } = useProjectMembers(activeProjectKey);

  // Filter issues by Key or Title
  const matchingIssues = useMemo(() => {
    if (!debouncedSearch.trim()) return issues.slice(0, 6);
    const q = debouncedSearch.toLowerCase().trim();
    return issues
      .filter(
        (iss) =>
          iss.key.toLowerCase().includes(q) ||
          iss.title.toLowerCase().includes(q) ||
          (iss.description && iss.description.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [issues, debouncedSearch]);

  const handleSelectIssue = (issue: Issue) => {
    closePalette();
    openEditModal(issue);
  };

  const handleNavigate = (path: string) => {
    closePalette();
    router.push(path);
  };

  const handleCreateIssue = () => {
    closePalette();
    openCreateModal();
  };

  const handleFilterByAssignee = (userId: string) => {
    closePalette();
    router.push(`/projects/${activeProjectKey}/board?assignee=${userId}`);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    closePalette();
  };

  return (
    <>
      <CommandDialog open={isOpen} onOpenChange={(open) => !open && closePalette()}>
      <CommandInput
        placeholder="Type a command or search issues..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No matching issues or commands found.</CommandEmpty>

        {/* Issues by Key / Title */}
        <CommandGroup heading="Issues">
          {matchingIssues.map((issue) => (
            <CommandItem
              key={issue.id}
              value={`${issue.key} ${issue.title}`}
              onSelect={() => handleSelectIssue(issue)}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <IssueTypeIcon type={issue.type} size={14} />
                <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0">
                  {issue.key}
                </span>
                <span className="truncate text-foreground font-medium">
                  {issue.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                  {issue.status}
                </Badge>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            value="create new issue"
            onSelect={handleCreateIssue}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Plus size={14} className="text-primary" />
              <span>Create new issue</span>
            </div>
            <kbd className="text-[10px] font-mono bg-muted border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground">
              C
            </kbd>
          </CommandItem>

          <CommandItem
            value="create new project workspace"
            onSelect={() => {
              closePalette();
              setIsCreateProjectOpen(true);
            }}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <FolderPlus size={14} className="text-primary" />
              <span>Create new project</span>
            </div>
          </CommandItem>

          <CommandItem
            value="toggle theme light dark"
            onSelect={handleToggleTheme}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun size={14} className="text-amber-500" />
              ) : (
                <Moon size={14} className="text-blue-500" />
              )}
              <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} mode</span>
            </div>
            <kbd className="text-[10px] font-mono bg-muted border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground">
              T
            </kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Filter by Assignee */}
        {projectMembers.length > 0 && (
          <CommandGroup heading="Filter by Assignee">
            {projectMembers.map((member) => {
              const u = member.user;
              if (!u) return null;
              return (
                <CommandItem
                  key={u.id}
                  value={`filter assignee ${u.name}`}
                  onSelect={() => handleFilterByAssignee(u.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm" className="h-5 w-5">
                      {u.avatarUrl ? (
                        <AvatarImage src={u.avatarUrl} alt={u.name} />
                      ) : (
                        <AvatarFallback className="text-[9px]">{u.name[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <span>Filter issues by {u.name}</span>
                  </div>
                  <User size={13} className="text-muted-foreground" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            value="go to board kanban"
            onSelect={() => handleNavigate(`/projects/${activeProjectKey}/board`)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard size={14} className="text-muted-foreground" />
              <span>Go to Kanban Board</span>
            </div>
            <kbd className="text-[10px] font-mono bg-muted border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground">
              G B
            </kbd>
          </CommandItem>

          <CommandItem
            value="go to backlog"
            onSelect={() => handleNavigate(`/projects/${activeProjectKey}/backlog`)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <ListTree size={14} className="text-muted-foreground" />
              <span>Go to Backlog</span>
            </div>
            <kbd className="text-[10px] font-mono bg-muted border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground">
              G L
            </kbd>
          </CommandItem>

          <CommandItem
            value="go to reports metrics burndown export"
            onSelect={() => handleNavigate(`/projects/${activeProjectKey}/reports`)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 size={14} className="text-muted-foreground" />
              <span>Go to Reports & Metrics</span>
            </div>
            <kbd className="text-[10px] font-mono bg-muted border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground">
              G R
            </kbd>
          </CommandItem>

          <CommandItem
            value="go to trash bin soft delete"
            onSelect={() => handleNavigate(`/projects/${activeProjectKey}/trash`)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 size={14} className="text-muted-foreground" />
              <span>Go to Trash Bin</span>
            </div>
            <kbd className="text-[10px] font-mono bg-muted border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground">
              G T
            </kbd>
          </CommandItem>

          <CommandItem
            value="go to project settings"
            onSelect={() => handleNavigate(`/projects/${activeProjectKey}/settings`)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings size={14} className="text-muted-foreground" />
              <span>Go to Settings</span>
            </div>
            <kbd className="text-[10px] font-mono bg-muted border border-border/80 px-1.5 py-0.5 rounded text-muted-foreground">
              G S
            </kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
    <CreateProjectDialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen} />
    </>
  );
}
