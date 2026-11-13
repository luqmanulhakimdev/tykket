'use client';

import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import {
  Play,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  Timer,
  Loader2,
  AlertCircle,
  Pencil,
  Layers,
  X,
} from 'lucide-react';
import { Sprint, Issue } from '@/types/issue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useStartSprintMutation,
  useCompleteSprintMutation,
  useBulkMoveSprintMutation,
} from '@/hooks/use-issues';
import { CreateSprintDialog } from './create-sprint-dialog';
import { EditSprintDialog } from './edit-sprint-dialog';
import { cn } from '@/lib/utils';

interface SprintManagerCardProps {
  projectKey: string;
  sprints: Sprint[];
  issues: Issue[];
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function SprintManagerCard({
  projectKey,
  sprints,
  issues,
}: SprintManagerCardProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [sprintToEdit, setSprintToEdit] = useState<Sprint | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showActiveSprintIssues, setShowActiveSprintIssues] = useState(false);

  const startMutation = useStartSprintMutation(projectKey);
  const completeMutation = useCompleteSprintMutation(projectKey);
  const bulkMoveMutation = useBulkMoveSprintMutation(projectKey);

  const handleOpenEdit = (sprint: Sprint) => {
    setSprintToEdit(sprint);
    setIsEditOpen(true);
  };

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED');

  // Compute metrics for active sprint
  const activeSprintIssues = activeSprint
    ? issues.filter(
        (i) =>
          (i.sprintId === activeSprint.id || i.sprint_id === activeSprint.id) &&
          i.type !== 'EPIC'
      )
    : [];

  const activeTotalPoints = activeSprintIssues.reduce(
    (sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0),
    0
  );

  const activeDonePoints = activeSprintIssues
    .filter((i) => i.status === 'DONE')
    .reduce((sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0), 0);

  const activeProgress =
    activeTotalPoints > 0
      ? Math.round((activeDonePoints / activeTotalPoints) * 100)
      : 0;

  const handleStartSprint = async (sprintId: string) => {
    try {
      await startMutation.mutateAsync({ sprintId });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to complete this active sprint? Incomplete issues will move to the backlog.'
      )
    ) {
      return;
    }
    try {
      await completeMutation.mutateAsync({ sprintId });
    } catch {
      // Handled in mutation onError
    }
  };

  return (
    <div className="border-b border-border/70 bg-card/30 backdrop-blur-xs px-6 py-3 space-y-3 shrink-0">
      {/* Top Header of Sprint Section */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors cursor-pointer"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Timer size={14} className="text-primary shrink-0" />
          <span>Sprint Management</span>
          {activeSprint && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            >
              1 Active
            </Badge>
          )}
          {plannedSprints.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-semibold"
            >
              {plannedSprints.length} Planned
            </Badge>
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* Create Sprint Button */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-7 px-2.5 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus size={13} />
            <span>Create Sprint</span>
          </Button>
        </div>
      </div>

      {/* Expanded Sprint Details */}
      {isExpanded && (
        <div className="space-y-3 pt-1">
          {/* 1. Active Sprint Card */}
          {activeSprint ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ACTIVE SPRINT
                    </span>
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {activeSprint.name}
                    </h3>
                    {(activeSprint.start_date || activeSprint.end_date) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar size={12} />
                        {formatDate(activeSprint.start_date) || 'Started'} —{' '}
                        {formatDate(activeSprint.end_date) || 'Ongoing'}
                      </span>
                    )}
                  </div>

                  {activeSprint.goal && (
                    <p className="text-xs text-muted-foreground italic flex items-center gap-1 line-clamp-1">
                      <Sparkles size={11} className="text-amber-500 shrink-0" />
                      <span>Goal: {activeSprint.goal}</span>
                    </p>
                  )}

                  {/* Points Progress and toggle issues */}
                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowActiveSprintIssues(!showActiveSprintIssues)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group/btn"
                    >
                      <span className="font-semibold text-foreground underline decoration-muted-foreground/40 underline-offset-2 group-hover/btn:decoration-foreground">
                        {activeSprintIssues.length} issues
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {activeDonePoints}
                      </span>
                      /{activeTotalPoints} pts done
                      <ChevronDown
                        size={12}
                        className={cn(
                          'transition-transform duration-200 opacity-60',
                          showActiveSprintIssues && 'rotate-180 opacity-100'
                        )}
                      />
                    </button>
                    <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${activeProgress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {activeProgress}%
                    </span>
                  </div>
                </div>

                {/* Complete & Edit Sprint Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(activeSprint)}
                    className="h-8 text-xs font-semibold gap-1.5"
                    title="Edit Active Sprint"
                  >
                    <Pencil size={12} />
                    <span>Edit Sprint</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCompleteSprint(activeSprint.id)}
                    disabled={completeMutation.isPending}
                    className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    {completeMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    <span>Complete Sprint</span>
                  </Button>
                </div>
              </div>

              {/* Collapsible issues chips list in active sprint */}
              {showActiveSprintIssues && activeSprintIssues.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {activeSprintIssues.map((iss) => (
                    <div
                      key={iss.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-background/80 border border-emerald-500/20 text-xs text-foreground group/chip hover:border-emerald-500/40 shadow-2xs"
                    >
                      <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                        {iss.key}
                      </span>
                      <span className="max-w-[130px] truncate text-[11px]">{iss.title}</span>
                      {typeof (iss.storyPoints ?? iss.story_points) === 'number' && (
                        <span className="text-[9px] font-mono font-bold bg-muted px-1 rounded text-muted-foreground">
                          {iss.storyPoints ?? iss.story_points}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => bulkMoveMutation.mutate({ issue_ids: [iss.id], sprint_id: null })}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors ml-0.5 cursor-pointer"
                        title="Remove from sprint"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Sprint Droppable Area */}
              <Droppable droppableId={`sprint-${activeSprint.id}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'rounded-lg border-2 border-dashed p-2.5 transition-all flex flex-col sm:flex-row items-center justify-between gap-3 select-none text-xs',
                      snapshot.isDraggingOver
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/40 scale-[1.01] shadow-md'
                        : 'border-emerald-500/25 bg-emerald-500/5 text-muted-foreground hover:border-emerald-500/40'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0',
                          snapshot.isDraggingOver
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        <Layers
                          size={15}
                          className={snapshot.isDraggingOver ? 'animate-bounce' : ''}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate text-xs">
                          {snapshot.isDraggingOver
                            ? `Release to assign to ${activeSprint.name}`
                            : `Drag & drop tickets here to assign to ${activeSprint.name}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {snapshot.isDraggingOver
                            ? 'Drop ticket to assign to this active sprint'
                            : 'Assigns ticket directly to current active sprint'}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] uppercase font-mono px-2 py-0.5 shrink-0 transition-colors',
                        snapshot.isDraggingOver
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {snapshot.isDraggingOver ? 'Release to drop' : 'Drop into Active Sprint'}
                    </Badge>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ) : (
            /* No Active Sprint Notice */
            <div className="rounded-lg border border-dashed border-border/70 p-3 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle size={15} className="text-amber-500 shrink-0" />
                <span>
                  No sprint is currently active. Start a planned sprint below or create a new sprint to begin an iteration.
                </span>
              </div>
            </div>
          )}

          {/* 2. Planned Sprints List */}
          {plannedSprints.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Planned Sprints ({plannedSprints.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {plannedSprints.map((sprint) => {
                  const sprintIssues = issues.filter(
                    (i) =>
                      (i.sprintId === sprint.id || i.sprint_id === sprint.id) &&
                      i.type !== 'EPIC'
                  );
                  const sprintPoints = sprintIssues.reduce(
                    (sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0),
                    0
                  );

                  return (
                    <div
                      key={sprint.id}
                      className="p-3 rounded-lg border border-border/60 bg-card hover:border-primary/30 transition-colors flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {sprint.name}
                          </h4>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            PLANNED
                          </Badge>
                        </div>

                        {(sprint.start_date || sprint.end_date) && (
                          <p className="text-[11px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(sprint.start_date) || 'TBD'} —{' '}
                            {formatDate(sprint.end_date) || 'TBD'}
                          </p>
                        )}

                        {sprint.goal && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">
                            &ldquo;{sprint.goal}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Planned Sprint Droppable Area */}
                      <Droppable droppableId={`sprint-${sprint.id}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              'rounded-md border-2 border-dashed p-2 transition-all flex items-center justify-between gap-2 select-none text-xs',
                              snapshot.isDraggingOver
                                ? 'border-primary bg-primary/20 text-primary font-semibold ring-2 ring-primary/40 scale-[1.01]'
                                : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40'
                            )}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Layers
                                size={13}
                                className={cn(
                                  'shrink-0',
                                  snapshot.isDraggingOver ? 'text-primary animate-bounce' : 'text-muted-foreground'
                                )}
                              />
                              <span className="truncate">
                                {snapshot.isDraggingOver
                                  ? `Release to add to ${sprint.name}`
                                  : `Drag ticket here to assign`}
                              </span>
                            </div>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {sprintIssues.length} issues • {sprintPoints} pts
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(sprint)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            title="Edit Sprint"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </Button>

                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => handleStartSprint(sprint.id)}
                            disabled={startMutation.isPending}
                            className="h-7 px-2.5 text-xs font-semibold gap-1 shadow-2xs"
                          >
                            {startMutation.isPending ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Play size={12} className="fill-current" />
                            )}
                            <span>Start</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Sprint Dialog */}
      <CreateSprintDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectKey={projectKey}
        nextSprintNumber={sprints.length + 1}
      />

      {/* Edit Sprint Dialog */}
      <EditSprintDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        projectKey={projectKey}
        sprint={sprintToEdit}
      />
    </div>
  );
}
