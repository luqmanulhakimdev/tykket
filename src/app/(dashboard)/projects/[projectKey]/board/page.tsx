'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { KanbanBoard } from '@/components/kanban/board';
import { BoardToolbar } from '@/components/kanban/board-toolbar';
import { ActiveSprintBanner } from '@/components/kanban/active-sprint-banner';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useProject, useSprints } from '@/hooks/use-issues';
import { Timer, ListTree, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BoardPage() {
  const params = useParams();
  const projectKey = (params?.projectKey as string) || 'TYK';

  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  const { data: project, isLoading: projectLoading } = useProject(projectKey);
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(projectKey);

  const isScrum = project?.type === 'SCRUM' || !project?.type;
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'ACTIVE') || null;
  }, [sprints]);

  if (projectLoading || (isScrum && sprintsLoading)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-3.5">
      {/* Board Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Board
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground uppercase">
              {projectKey}
            </Badge>
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide',
                isScrum
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
              )}
            >
              {isScrum ? 'Scrum' : 'Kanban'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isScrum
              ? 'Sprint execution board with drag and drop issue status transitions'
              : 'Continuous delivery flow with real-time lifecycle tracking without sprints'}
          </p>
        </div>
      </div>

      {/* If Scrum and NO active sprint, show required sprint prompt */}
      {isScrum && !activeSprint ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/80 rounded-2xl bg-muted/10 p-8 text-center max-w-lg mx-auto my-auto">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 ring-8 ring-primary/5">
            <Timer size={28} />
          </div>
          <h2 className="text-base font-bold text-foreground">No Active Sprint</h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            This project is configured as <strong className="text-foreground">Scrum</strong>. In Scrum mode, the Board requires an active sprint to display and track tickets. Start a sprint from the Backlog to view your board.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <Link
              href={`/projects/${projectKey}/backlog`}
              className={buttonVariants({
                variant: 'default',
                size: 'sm',
                className: 'h-9 px-4 text-xs font-semibold gap-2 shadow-xs cursor-pointer',
              })}
            >
              <ListTree size={14} />
              <span>Go to Backlog to Start Sprint</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Board Filtering & Search Toolbar (Syncs with URL query params) */}
          <div className="shrink-0">
            <BoardToolbar
              projectKey={projectKey}
              totalIssuesCount={totalCount}
              filteredIssuesCount={filteredCount}
            />
          </div>

          {/* Running Sprint Status Banner (Scrum mode only) */}
          {isScrum && activeSprint && <ActiveSprintBanner projectKey={projectKey} />}

          {/* Main Board Canvas */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <KanbanBoard
              projectKey={projectKey}
              projectType={project?.type || 'SCRUM'}
              activeSprintId={isScrum ? activeSprint?.id : undefined}
              onCountsChange={(total, filtered) => {
                setTotalCount(total);
                setFilteredCount(filtered);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
