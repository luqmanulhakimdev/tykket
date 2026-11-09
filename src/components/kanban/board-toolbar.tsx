'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { IssuePriority, IssueType } from '@/types/issue';
import { IssueTypeIcon, issueTypeOptions } from '@/components/issues/issue-type-icon';
import { IssuePriorityIcon, issuePriorityOptions } from '@/components/issues/issue-priority-icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export interface BoardFilters {
  search: string;
  types: IssueType[];
  priority: IssuePriority | 'ALL';
  assignee: string | null;
}

interface BoardToolbarProps {
  totalIssuesCount?: number;
  filteredIssuesCount?: number;
}

export function BoardToolbar({
  totalIssuesCount = 0,
  filteredIssuesCount = 0,
}: BoardToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

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

  const hasActiveFilters = Boolean(
    search.trim() || types.length > 0 || (priority && priority !== 'ALL') || assignee
  );

  // Helper to update URL params
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

  // Type filter toggle
  const toggleTypeFilter = (selectedType: IssueType) => {
    let nextTypes: IssueType[];
    if (types.includes(selectedType)) {
      nextTypes = types.filter((t) => t !== selectedType);
    } else {
      nextTypes = [...types, selectedType];
    }
    updateFilters({ type: nextTypes.length > 0 ? nextTypes.join(',') : null });
  };

  // Priority filter toggle
  const setPriorityFilter = (newPriority: IssuePriority | 'ALL') => {
    updateFilters({ priority: newPriority === 'ALL' ? null : newPriority });
  };

  // Only My Issues toggle
  const toggleMyIssues = () => {
    if (isMyIssuesActive) {
      updateFilters({ assignee: null });
    } else {
      updateFilters({ assignee: currentUserId || 'me' });
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/60 text-xs">
      {/* Left side: Search input + Filters */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        {/* Instant Search Input */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            id="board-search-input"
            value={search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Filter board... (Press /)"
            className="h-8 pl-8 pr-7 text-xs bg-background/80 border-border/70"
          />
          {search && (
            <button
              type="button"
              onClick={() => updateFilters({ search: null })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Issue Type Multi-select Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
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
            className={cn(
              'h-8 px-2.5 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/70 flex items-center gap-1.5 font-medium transition-colors cursor-pointer outline-none',
              priority !== 'ALL' && 'border-primary/40 bg-primary/5 text-primary'
            )}
          >
            <SlidersHorizontal size={13} />
            <span>
              {priority === 'ALL' ? 'Priority' : priority}
            </span>
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

        {/* Only My Issues Toggle */}
        <Button
          type="button"
          variant={isMyIssuesActive ? 'default' : 'outline'}
          size="sm"
          onClick={toggleMyIssues}
          className={cn(
            'h-8 text-xs gap-1.5 font-medium',
            !isMyIssuesActive && 'bg-background/80 hover:bg-muted/70 border-border/70'
          )}
        >
          <UserCheck size={13} />
          <span>Only My Issues</span>
        </Button>

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 hover:bg-muted/60"
          >
            <RotateCcw size={12} />
            <span>Clear filters</span>
          </Button>
        )}
      </div>

      {/* Right side: Matching Issues Counter */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 pr-1">
        <span>Showing:</span>
        <span className="font-semibold text-foreground font-mono">
          {filteredIssuesCount}
        </span>
        <span>of {totalIssuesCount} issues</span>
      </div>
    </div>
  );
}
