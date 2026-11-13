'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { IssuePriority, IssueType } from '@/types/issue';
import { IssueTypeIcon, issueTypeOptions } from '@/components/issues/issue-type-icon';
import { IssuePriorityIcon, issuePriorityOptions } from '@/components/issues/issue-priority-icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectMembers } from '@/hooks/use-issues';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  X,
  Filter,
  Check,
  UserCheck,
  UserX,
  Users,
  RotateCcw,
  SlidersHorizontal,
  BarChart2,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

interface BacklogToolbarProps {
  projectKey: string;
  totalCount: number;
  filteredCount: number;
  totalSprintPoints?: number;
  onOpenSprintPoints: () => void;
  onOpenCreateIssue: () => void;
}

export function BacklogToolbar({
  projectKey,
  totalCount,
  filteredCount,
  totalSprintPoints = 0,
  onOpenSprintPoints,
  onOpenCreateIssue,
}: BacklogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data: projectMembers = [] } = useProjectMembers(projectKey);

  // Parse filters from URL search params
  const search = searchParams?.get('search') || '';
  const typeParam = searchParams?.get('type') || '';
  const types: IssueType[] = typeParam
    ? (typeParam.split(',') as IssueType[])
    : [];
  const priority = (searchParams?.get('priority') || 'ALL') as IssuePriority | 'ALL';
  const assignee = searchParams?.get('assignee') || null;

  const currentUserId = user?.id;
  const isMyIssuesActive = assignee === currentUserId || assignee === 'me';

  const selectedMember = projectMembers.find(
    (m) => (m.user?.id || m.user_id) === assignee
  );

  const assigneeLabel = selectedMember
    ? selectedMember.user?.name || 'Assignee'
    : assignee === 'unassigned'
    ? 'Unassigned'
    : isMyIssuesActive
    ? 'My Issues'
    : 'Assignee';

  const hasActiveFilters = Boolean(
    search.trim() || types.length > 0 || (priority && priority !== 'ALL') || assignee
  );

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'ALL') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      return params.toString();
    },
    [searchParams]
  );

  const updateFilters = (updates: Record<string, string | null>) => {
    const queryString = createQueryString(updates);
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const toggleTypeFilter = (selectedType: IssueType) => {
    let nextTypes: IssueType[];
    if (types.includes(selectedType)) {
      nextTypes = types.filter((t) => t !== selectedType);
    } else {
      nextTypes = [...types, selectedType];
    }
    updateFilters({ type: nextTypes.length > 0 ? nextTypes.join(',') : null });
  };

  const setPriorityFilter = (newPriority: IssuePriority | 'ALL') => {
    updateFilters({ priority: newPriority === 'ALL' ? null : newPriority });
  };

  const clearAllFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 border-b border-border/60 bg-card/25 text-xs shrink-0">
      {/* Left side: Search + Type + Priority + Assignee Filters */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        {/* Instant Search Input */}
        <div className="relative w-full sm:w-64 md:w-72">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search backlog issues..."
            className="h-8 pl-8 pr-7 text-xs bg-background/80 border-border/70"
          />
          {search && (
            <button
              type="button"
              onClick={() => updateFilters({ search: null })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Issue Type Multi-select Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              'h-8 px-2.5 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/70 flex items-center gap-1.5 font-medium transition-colors cursor-pointer outline-none',
              types.length > 0 && 'border-primary/40 bg-primary/5 text-primary'
            )}
          >
            <Filter size={13} />
            <span>Type</span>
            {types.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">
                {types.length}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 p-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase">
                Filter by Type
              </DropdownMenuLabel>
              {issueTypeOptions.map((opt) => {
                const isSelected = types.includes(opt.value);
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTypeFilter(opt.value);
                    }}
                    className="flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <IssueTypeIcon type={opt.value} size={14} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-primary font-bold" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              'h-8 px-2.5 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/70 flex items-center gap-1.5 font-medium transition-colors cursor-pointer outline-none',
              priority !== 'ALL' && 'border-primary/40 bg-primary/5 text-primary'
            )}
          >
            <SlidersHorizontal size={13} />
            <span>{priority === 'ALL' ? 'Priority' : priority}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 p-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase">
                Filter by Priority
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setPriorityFilter('ALL')}
                className="flex items-center justify-between cursor-pointer text-xs"
              >
                <span>All Priorities</span>
                {priority === 'ALL' && <Check size={13} className="text-primary font-bold" />}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {issuePriorityOptions.map((opt) => {
                const isSelected = priority === opt.value;
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setPriorityFilter(opt.value)}
                    className="flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <IssuePriorityIcon priority={opt.value} size={14} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-primary font-bold" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              'h-8 px-2.5 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/70 flex items-center gap-1.5 font-medium transition-colors cursor-pointer outline-none',
              Boolean(assignee) && 'border-primary/40 bg-primary/5 text-primary'
            )}
          >
            <Users size={13} />
            <span className="truncate max-w-[130px]">{assigneeLabel}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 p-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase">
                Filter by Assignee
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => updateFilters({ assignee: null })}
                className="flex items-center justify-between cursor-pointer text-xs"
              >
                <span>All Assignees</span>
                {!assignee && <Check size={13} className="text-primary font-bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilters({ assignee: currentUserId || 'me' })}
                className="flex items-center justify-between cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-muted-foreground" />
                  <span>My Issues</span>
                </div>
                {isMyIssuesActive && <Check size={13} className="text-primary font-bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilters({ assignee: 'unassigned' })}
                className="flex items-center justify-between cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <UserX size={14} className="text-muted-foreground" />
                  <span>Unassigned</span>
                </div>
                {assignee === 'unassigned' && <Check size={13} className="text-primary font-bold" />}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {projectMembers.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Team Members
                  </DropdownMenuLabel>
                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    {projectMembers.map((member) => {
                      const memberUser = member.user;
                      const memberId = memberUser?.id || member.user_id;
                      const isSelected = assignee === memberId;
                      const memberName = memberUser?.name || 'Member';
                      const memberAvatar = memberUser?.avatarUrl || memberUser?.avatar_url;

                      return (
                        <DropdownMenuItem
                          key={member.id}
                          onClick={() => updateFilters({ assignee: memberId })}
                          className="flex items-center justify-between cursor-pointer text-xs py-1.5"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Avatar size="sm" className="h-5 w-5">
                              {memberAvatar ? (
                                <AvatarImage src={memberAvatar} alt={memberName} />
                              ) : (
                                <AvatarFallback className="text-[9px]">
                                  {memberName[0]}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="truncate">{memberName}</span>
                          </div>
                          {isSelected && <Check size={13} className="text-primary font-bold" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            title="Reset all filters"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* Right side: Summary / Actions */}
      <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
        {/* Filter count indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-muted-foreground text-[11px] mr-1">
          <span>Showing</span>
          <span className="font-semibold text-foreground font-mono">{filteredCount}</span>
          <span>of</span>
          <span className="font-semibold text-foreground font-mono">{totalCount}</span>
        </div>

        {/* Story Points by User Popup Trigger */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenSprintPoints}
          className="h-8 px-2.5 text-xs gap-1.5 bg-background/80 hover:bg-muted font-medium cursor-pointer shadow-2xs border-border/80"
          title="View Sprint Workload & Total Story Points per User"
        >
          <BarChart2 size={14} className="text-primary" />
          <span>Sprint Story Points</span>
          {totalSprintPoints > 0 && (
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 ml-0.5"
            >
              {totalSprintPoints} pts
            </Badge>
          )}
        </Button>

        {/* Create Backlog Issue Button */}
        <Button
          type="button"
          size="sm"
          onClick={onOpenCreateIssue}
          className="h-8 px-3 text-xs gap-1.5 font-semibold cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>Add Issue</span>
        </Button>
      </div>
    </div>
  );
}

