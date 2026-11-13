'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  ListTree,
} from 'lucide-react';
import { useSprints, useIssues } from '@/hooks/use-issues';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

interface ActiveSprintBannerProps {
  projectKey: string;
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

export function ActiveSprintBanner({ projectKey }: ActiveSprintBannerProps) {
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(projectKey);
  const { data: issues = [] } = useIssues(projectKey);

  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'ACTIVE') || null;
  }, [sprints]);

  // Compute metrics for active sprint
  const sprintIssues = useMemo(() => {
    if (!activeSprint) return [];
    return issues.filter(
      (i) =>
        (i.sprintId === activeSprint.id || i.sprint_id === activeSprint.id) &&
        i.type !== 'EPIC'
    );
  }, [issues, activeSprint]);

  const totalPoints = useMemo(() => {
    return sprintIssues.reduce(
      (sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0),
      0
    );
  }, [sprintIssues]);

  const donePoints = useMemo(() => {
    return sprintIssues
      .filter((i) => i.status === 'DONE')
      .reduce((sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0), 0);
  }, [sprintIssues]);

  const doneIssuesCount = useMemo(() => {
    return sprintIssues.filter((i) => i.status === 'DONE').length;
  }, [sprintIssues]);

  const progressPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  // Days remaining calculation
  const daysRemaining = useMemo(() => {
    if (!activeSprint?.end_date) return null;
    const end = new Date(activeSprint.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [activeSprint?.end_date]);

  if (sprintsLoading) return null;

  if (!activeSprint) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap size={14} className="text-muted-foreground" />
          <span>No active sprint running for this project.</span>
        </div>
        <Link
          href={`/projects/${projectKey}/backlog`}
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'h-7 text-xs font-medium text-primary hover:text-primary gap-1 px-2',
          })}
        >
          <ListTree size={12} />
          <span>Go to Backlog to start a sprint</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-xs">
      {/* Left: Active sprint name, status, dates, goal */}
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            RUNNING SPRINT
          </span>
          <h2 className="text-sm font-bold text-foreground truncate">
            {activeSprint.name}
          </h2>
          {(activeSprint.start_date || activeSprint.end_date) && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Calendar size={12} />
              {formatDate(activeSprint.start_date) || 'Started'} —{' '}
              {formatDate(activeSprint.end_date) || 'Ongoing'}
            </span>
          )}
          {daysRemaining !== null && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-medium font-mono gap-1 text-muted-foreground"
            >
              <Clock size={10} />
              {daysRemaining > 0
                ? `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left`
                : daysRemaining === 0
                ? 'Ends today'
                : 'Overdue'}
            </Badge>
          )}
        </div>

        {activeSprint.goal && (
          <p className="text-xs text-muted-foreground italic flex items-center gap-1 line-clamp-1">
            <Sparkles size={11} className="text-amber-500 shrink-0" />
            <span>Goal: {activeSprint.goal}</span>
          </p>
        )}
      </div>

      {/* Right: Progress bar & Story Points metric */}
      <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {doneIssuesCount} of {sprintIssues.length} issues
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {donePoints}/{totalPoints} pts
            </span>
          </div>
          <div className="w-36 h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <Link
          href={`/projects/${projectKey}/backlog`}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'h-7 text-xs font-medium gap-1 px-2 border-emerald-500/30 text-foreground',
          })}
        >
          <span>Manage</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
