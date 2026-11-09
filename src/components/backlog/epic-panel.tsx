'use client';

import React, { useState } from 'react';
import { Issue } from '@/types/issue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Plus,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EpicPanelProps {
  epics: Issue[];
  issues: Issue[];
  selectedEpicId: string | null;
  onSelectEpic: (epicId: string | null) => void;
  onCreateEpic: () => void;
}

export function EpicPanel({
  epics,
  issues,
  selectedEpicId,
  onSelectEpic,
  onCreateEpic,
}: EpicPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Helper to count issues attached to an epic
  const getEpicIssueCount = (epicId: string) => {
    return issues.filter((iss) => iss.parentId === epicId).length;
  };

  if (isCollapsed) {
    return (
      <div className="border-r border-border/60 bg-muted/20 flex flex-col items-center py-4 px-1.5 transition-all w-10 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Expand Epics panel"
        >
          <ChevronRight size={16} />
        </Button>
        <div className="mt-8 flex items-center justify-center [writing-mode:vertical-rl] rotate-180 text-xs font-semibold tracking-wider text-muted-foreground uppercase gap-2">
          <Zap size={14} className="text-purple-500 rotate-90" />
          <span>Epics ({epics.length})</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border/60 bg-muted/10 flex flex-col shrink-0 transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <Zap size={15} className="text-purple-500 fill-purple-500/20" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Epics
          </h3>
          <Badge variant="secondary" className="text-[11px] font-mono px-1.5 py-0 h-4 rounded-full">
            {epics.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateEpic}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded"
            title="Create Epic"
          >
            <Plus size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded"
            title="Collapse Epics panel"
          >
            <ChevronLeft size={14} />
          </Button>
        </div>
      </div>

      {/* Epic List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* All Issues Filter Button */}
        <button
          type="button"
          onClick={() => onSelectEpic(null)}
          className={cn(
            'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left',
            selectedEpicId === null
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Layers size={14} />
            <span>All Backlog Items</span>
          </div>
          <span className="text-[11px] opacity-80">{issues.length}</span>
        </button>

        {epics.map((epic) => {
          const isSelected = selectedEpicId === epic.id;
          const childCount = getEpicIssueCount(epic.id);

          return (
            <button
              key={epic.id}
              type="button"
              onClick={() => onSelectEpic(isSelected ? null : epic.id)}
              className={cn(
                'w-full flex flex-col gap-1 p-2.5 rounded-lg text-xs transition-colors text-left border',
                isSelected
                  ? 'bg-purple-500/10 border-purple-500/40 text-foreground ring-1 ring-purple-500/30 font-medium'
                  : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                  {epic.key}
                </span>
                <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                  {childCount} issues
                </span>
              </div>
              <p className="truncate text-xs font-medium text-foreground">{epic.title}</p>
            </button>
          );
        })}

        {epics.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No epics defined yet.
          </div>
        )}
      </div>
    </div>
  );
}

