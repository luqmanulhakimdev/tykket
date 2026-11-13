'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ListTree,
  Settings,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  LogOut,
  Check,
  Plus,
  FolderKanban,
  BarChart3,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTrashIssues, useProjects } from '@/hooks/use-issues';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

interface SidebarProps {
  projectKey?: string;
}

export function Sidebar({ projectKey = 'TYK' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const { user, logout } = useAuth();
  const currentUser = user || {
    id: 'guest',
    name: 'Tykket User',
    email: 'user@tykket.dev',
  };
  const { data: projects = [] } = useProjects();

  // Dynamically resolve active project key from current URL pathname (/projects/[projectKey]/...)
  const urlProjectKey = pathname?.match(/\/projects\/([^/]+)/)?.[1] || projectKey;

  const currentProject = projects.find(
    (p) => p.key?.toUpperCase() === urlProjectKey?.toUpperCase() || p.id === urlProjectKey
  );
  const activeProjectKey = currentProject?.key || urlProjectKey;
  const activeProjectName = currentProject?.name || activeProjectKey;
  const activeProjectAvatar = activeProjectKey.slice(0, 2).toUpperCase();

  const { data: trashIssues = [] } = useTrashIssues(activeProjectKey);

  const navItems = [
    {
      title: 'Kanban Board',
      href: `/projects/${activeProjectKey}/board`,
      icon: LayoutDashboard,
      active: pathname?.includes('/board'),
    },
    {
      title: 'Backlog',
      href: `/projects/${activeProjectKey}/backlog`,
      icon: ListTree,
      active: pathname?.includes('/backlog'),
    },
    {
      title: 'Reports & Metrics',
      href: `/projects/${activeProjectKey}/reports`,
      icon: BarChart3,
      active: pathname?.includes('/reports'),
    },
    {
      title: 'Trash Bin',
      href: `/projects/${activeProjectKey}/trash`,
      icon: Trash2,
      active: pathname?.includes('/trash'),
      badge: trashIssues.length > 0 ? trashIssues.length : undefined,
    },
    {
      title: 'Settings',
      href: `/projects/${activeProjectKey}/settings`,
      icon: Settings,
      active: pathname?.includes('/settings'),
    },
  ];

  return (
    <>
      <aside
      className={cn(
        'relative flex flex-col border-r border-border/70 bg-card/60 backdrop-blur-md transition-all duration-200 z-20 shrink-0 h-screen select-none',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top Workspace Selector */}
      <div className="p-3 border-b border-border/60">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/70 transition-colors text-left outline-none cursor-pointer',
              collapsed && 'justify-center p-1.5'
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs shrink-0 tracking-wider">
              {activeProjectAvatar}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-foreground truncate">{activeProjectName}</span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase px-1 py-0 bg-muted rounded">
                    {activeProjectKey}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{currentProject?.description || 'Workspace'}</p>
              </div>
            )}
            {!collapsed && <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-60 p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Workspaces & Projects
              </DropdownMenuLabel>
              {projects.length > 0 ? (
                projects.map((p) => {
                  const isSelected =
                    p.key?.toUpperCase() === activeProjectKey?.toUpperCase() || p.id === activeProjectKey;
                  const pAvatar = (p.key || p.name).slice(0, 2).toUpperCase();
                  return (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => router.push(`/projects/${p.key || p.id}/board`)}
                      className={cn(
                        'gap-2.5 cursor-pointer text-xs py-2 px-2.5 rounded-md transition-colors',
                        isSelected && 'bg-muted font-semibold text-foreground'
                      )}
                    >
                      <div className="h-6 w-6 rounded bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {pAvatar}
                      </div>
                      <div className="flex-1 truncate">
                        <p className="font-medium leading-none truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Key: {p.key}</p>
                      </div>
                      {isSelected && <Check size={14} className="text-primary shrink-0 ml-1" />}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <DropdownMenuItem
                  onClick={() => router.push(`/projects/${activeProjectKey}/board`)}
                  className="gap-2 cursor-pointer text-xs py-2"
                >
                  <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
                    {activeProjectAvatar}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="font-medium leading-none">{activeProjectName}</p>
                    <p className="text-[10px] text-muted-foreground">Key: {activeProjectKey}</p>
                  </div>
                  <Check size={14} className="text-primary shrink-0 ml-1" />
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/projects')}
              className="gap-2.5 cursor-pointer text-xs py-2 px-2.5 hover:bg-muted font-medium"
            >
              <div className="h-6 w-6 rounded bg-muted text-foreground border border-border/60 flex items-center justify-center font-bold text-xs shrink-0">
                <FolderKanban size={13} />
              </div>
              <div className="flex-1 truncate">
                <p className="font-semibold leading-none">All Projects</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Browse project workspaces</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsCreateProjectOpen(true)}
              className="gap-2.5 cursor-pointer text-xs py-2 px-2.5 text-primary hover:text-primary font-medium focus:text-primary"
            >
              <div className="h-6 w-6 rounded bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                <Plus size={13} />
              </div>
              <div className="flex-1 truncate">
                <p className="font-semibold leading-none">Create New Project</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Start a new workspace</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Project Views
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group cursor-pointer',
                item.active
                  ? 'bg-muted text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon size={18} className={cn('shrink-0', item.active && 'text-primary')} />
              {!collapsed && <span className="truncate flex-1">{item.title}</span>}
              {!collapsed && item.badge !== undefined && (
                <Badge
                  variant="outline"
                  className="text-xs font-mono font-semibold px-2 py-0 h-4.5 rounded-full bg-muted text-muted-foreground group-hover:border-border"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      {/* Collapse Toggle Button */}
      <div className="px-2 py-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground justify-center h-8',
            !collapsed && 'justify-start px-2'
          )}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span>Collapse Sidebar</span>}
        </Button>
      </div>

      {/* User Profile Badge at Bottom */}
      <div className="p-2.5 border-t border-border/60 bg-muted/20">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left outline-none cursor-pointer',
              collapsed && 'justify-center p-0'
            )}
          >
            <div className="relative shrink-0">
              <Avatar size="sm" className="h-7 w-7 ring-1 ring-border">
                {currentUser.avatarUrl ? (
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                ) : (
                  <AvatarFallback className="text-[10px] font-medium">{currentUser.name[0]}</AvatarFallback>
                )}
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate leading-tight">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <span className="text-emerald-500 font-semibold">• Focus mode</span>
                </div>
              </div>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="top" className="w-56 p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                Signed in as
              </DropdownMenuLabel>
              <div className="px-2 py-1 text-xs font-semibold text-foreground truncate">
                {currentUser.name}
              </div>
              <div className="px-2 pb-1.5 text-[10px] text-muted-foreground truncate">
                {currentUser.email || 'alex@tykket.dev'}
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer gap-2"
            >
              <LogOut size={13} />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
    <CreateProjectDialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen} />
    </>
  );
}
