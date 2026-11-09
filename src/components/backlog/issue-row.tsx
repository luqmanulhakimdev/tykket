'use client';

import React, { useState } from 'react';
import { Issue, IssuePriority, IssueStatus } from '@/types/issue';
import { IssueTypeIcon } from '@/components/issues/issue-type-icon';
import { IssuePriorityIcon, issuePriorityOptions } from '@/components/issues/issue-priority-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const issueStatusOptions: { value: IssueStatus; label: string; dotColor: string }[] = [
  { value: 'BACKLOG', label: 'Backlog', dotColor: 'bg-slate-400' },
  { value: 'TODO', label: 'To Do', dotColor: 'bg-slate-400' },
  { value: 'IN_PROGRESS', label: 'In Progress', dotColor: 'bg-blue-500' },
  { value: 'IN_REVIEW', label: 'In Review', dotColor: 'bg-amber-500' },
  { value: 'DONE', label: 'Done', dotColor: 'bg-emerald-500' },
];

const statusLabelMap: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

interface IssueRowProps {
  issue: Issue;
  level?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onTitleChange?: (id: string, newTitle: string) => void;
  onStatusChange?: (id: string, newStatus: IssueStatus) => void;
  onPriorityChange?: (id: string, newPriority: IssuePriority) => void;
  onDelete?: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  onClick?: (issue: Issue) => void;
}

const statusBadgeStyles: Record<IssueStatus, string> = {
  BACKLOG: 'bg-muted text-muted-foreground border-border',
  TODO: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  IN_REVIEW: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  DONE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

export function IssueRow({
  issue,
  level = 0,
  hasChildren = false,
  isExpanded = true,
  onToggleExpand,
  onTitleChange,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onAddChild,
  onClick,
}: IssueRowProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue !== issue.title && onTitleChange) {
      onTitleChange(issue.id, titleValue.trim());
    } else {
      setTitleValue(issue.title);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex items-center justify-between py-2.5 px-3 hover:bg-muted/50 border-b border-border/40 text-sm transition-colors',
        level > 0 && 'bg-muted/10'
      )}
      style={{ paddingLeft: `${Math.max(12, level * 28 + 12)}px` }}
    >
      {/* Connecting guide lines for nested items */}
      {level > 0 && (
        <span
          className="absolute border-l-2 border-b-2 border-border/60 rounded-bl-sm pointer-events-none"
          style={{
            left: `${(level - 1) * 28 + 20}px`,
            top: 0,
            bottom: '50%',
            width: '14px',
          }}
        />
      )}

      {/* Left side: Expand caret, Type, Key, Editable Title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
        {/* Expand / Collapse button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4.5 shrink-0" />
        )}

        {/* Issue Type Icon */}
        <IssueTypeIcon type={issue.type} size={15} />

        {/* Issue Key */}
        <button
          type="button"
          onClick={() => onClick?.(issue)}
          className="font-mono text-xs font-semibold text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          {issue.key}
        </button>

        {/* Editable Inline Title */}
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleValue(issue.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="w-full bg-background border border-primary/50 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              className={cn(
                'block truncate cursor-text hover:underline underline-offset-2 font-medium text-sm text-foreground',
                issue.status === 'DONE' && 'line-through text-muted-foreground'
              )}
              title="Click to inline edit title"
            >
              {issue.title}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Status Dropdown, Priority, Assignee, Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Beautified Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              'text-[11px] font-medium px-2 py-0.5 rounded-full border cursor-pointer inline-flex items-center gap-1 transition-colors outline-none shadow-2xs hover:opacity-90',
              statusBadgeStyles[issue.status]
            )}
          >
            <span>{statusLabelMap[issue.status] || issue.status}</span>
            <ChevronDown size={10} className="opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 p-1 bg-popover/95 backdrop-blur-md shadow-xl border-border">
            {issueStatusOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onStatusChange?.(issue.id, opt.value)}
                className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer hover:bg-muted rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', opt.dotColor)} />
                  <span>{opt.label}</span>
                </div>
                {issue.status === opt.value && <Check size={12} className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Beautified Priority Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className="p-1 rounded-md hover:bg-muted/70 transition-colors inline-flex items-center gap-0.5 outline-none cursor-pointer"
            title={`Priority: ${issue.priority}`}
          >
            <IssuePriorityIcon priority={issue.priority} size={14} />
            <ChevronDown size={10} className="opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 p-1 bg-popover/95 backdrop-blur-md shadow-xl border-border">
            {issuePriorityOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onPriorityChange?.(issue.id, opt.value)}
                className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer hover:bg-muted rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IssuePriorityIcon priority={opt.value} size={14} />
                  <span>{opt.label}</span>
                </div>
                {issue.priority === opt.value && <Check size={12} className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee Avatar */}
        <div className="w-6 flex justify-center">
          {issue.assignee ? (
            <Avatar size="sm" className="h-5 w-5 ring-1 ring-border">
              {issue.assignee.avatarUrl ? (
                <AvatarImage src={issue.assignee.avatarUrl} alt={issue.assignee.name} />
              ) : (
                <AvatarFallback className="text-[9px]">{issue.assignee.name[0]}</AvatarFallback>
              )}
            </Avatar>
          ) : (
            <span className="text-[10px] text-muted-foreground/60">—</span>
          )}
        </div>

        {/* Add Child / Subtask Button */}
        {issue.type !== 'SUBTASK' && onAddChild && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(issue.id);
            }}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add child issue or subtask"
          >
            <Plus size={13} />
          </Button>
        )}

        {/* Delete Button */}
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete issue ${issue.key}?`)) {
                onDelete(issue.id);
              }
            }}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete issue"
          >
            <Trash2 size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

