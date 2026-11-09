'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Column, Issue, IssueStatus } from '@/types/issue';
import { IssueCard } from './issue-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: Column;
  onCardClick: (issue: Issue) => void;
  onAddClick: (status: IssueStatus) => void;
}

const statusIndicatorColors: Record<IssueStatus, string> = {
  BACKLOG: 'bg-slate-400',
  TODO: 'bg-zinc-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-amber-500',
  DONE: 'bg-emerald-500',
};

export function KanbanColumn({ column, onCardClick, onAddClick }: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-72 md:w-80 shrink-0 bg-muted/30 border border-border/60 rounded-xl max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span
            className={cn('w-2 h-2 rounded-full shrink-0', statusIndicatorColors[column.id] || 'bg-slate-400')}
          />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            {column.title}
          </h3>
          <Badge
            variant="secondary"
            className="text-xs font-mono font-semibold px-2 py-0 h-4.5 rounded-full bg-muted text-foreground"
          >
            {column.issues.length}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddClick(column.id)}
          className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md"
          title={`Add issue to ${column.title}`}
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Droppable Issue List */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 p-2 space-y-2 overflow-y-auto min-h-[150px] transition-colors rounded-b-xl',
              snapshot.isDraggingOver && 'bg-primary/5 ring-1 ring-primary/20'
            )}
          >
            {column.issues.map((issue, index) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                index={index}
                onClick={onCardClick}
              />
            ))}
            {provided.placeholder}

            {column.issues.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border/60 rounded-lg m-1">
                <p className="text-xs text-muted-foreground">No issues yet</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddClick(column.id)}
                  className="mt-1 h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                >
                  <Plus size={12} />
                  Add issue
                </Button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

