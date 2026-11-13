'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Issue } from '@/types/issue';
import { IssueTypeIcon } from '@/components/issues/issue-type-icon';
import { IssuePriorityIcon } from '@/components/issues/issue-priority-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface IssueCardProps {
  issue: Issue;
  index: number;
  onClick: (issue: Issue) => void;
}

export function IssueCard({ issue, index, onClick }: IssueCardProps) {
  const storyPoints = issue.storyPoints ?? issue.story_points;
  const hasStoryPoints = typeof storyPoints === 'number';

  return (
    <Draggable draggableId={issue.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(issue)}
          className={cn(
            'group relative rounded-lg border border-border/70 bg-card p-3 shadow-xs select-none cursor-pointer',
            'transition-all duration-150 hover:border-border hover:shadow-md hover:bg-card/90',
            snapshot.isDragging &&
              'rotate-2 shadow-2xl ring-2 ring-primary/40 bg-card/95 scale-[1.02] z-50 transition-none'
          )}
        >
          {/* Top row: Type icon, Key, Priority */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <IssueTypeIcon type={issue.type} size={15} />
              <span className="text-xs font-mono font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                {issue.key}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <IssuePriorityIcon priority={issue.priority} size={15} />
            </div>
          </div>

          {/* Title */}
          <h4 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug mb-3">
            {issue.title}
          </h4>

          {/* Bottom row: Parent badge, Story Points, and Assignee */}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground gap-2">
            {issue.parentId ? (
              <Badge
                variant="outline"
                className="text-[11px] px-1.5 py-0 h-4 font-mono font-medium bg-muted/40 border-border text-muted-foreground truncate max-w-[110px]"
              >
                {issue.parentId.startsWith('epic') ? 'Epic' : 'Subtask'}
              </Badge>
            ) : (
              <div />
            )}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {/* Story Points Indicator */}
              <span
                className={cn(
                  'h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-mono font-semibold flex items-center justify-center border transition-colors',
                  hasStoryPoints
                    ? 'bg-muted/80 text-foreground border-border/80 shadow-2xs'
                    : 'text-muted-foreground/40 border-dashed border-border/60 bg-muted/20'
                )}
                title={hasStoryPoints ? `Story Points: ${storyPoints}` : 'Story Points: Unestimated'}
              >
                {hasStoryPoints ? storyPoints : '—'}
              </span>

              {/* Assignee Avatar */}
              {issue.assignee ? (
                <Avatar size="sm" className="h-5 w-5 ring-1 ring-border">
                  {issue.assignee.avatarUrl ? (
                    <AvatarImage src={issue.assignee.avatarUrl} alt={issue.assignee.name} />
                  ) : (
                    <AvatarFallback className="text-[9px] font-medium">
                      {issue.assignee.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
              ) : (
                <div
                  className="h-5 w-5 rounded-full border border-dashed border-border/80 flex items-center justify-center text-[10px] text-muted-foreground/60"
                  title="Unassigned"
                >
                  ?
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

