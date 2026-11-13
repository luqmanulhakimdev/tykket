'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Issue } from '@/types/issue';
import { useSprints, useProjectMembers } from '@/hooks/use-issues';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart2,
  ChevronDown,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SprintPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  issues: Issue[];
}

interface UserWorkload {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  totalPoints: number;
  issueCount: number;
  donePoints: number;
  inProgressPoints: number;
  inReviewPoints: number;
  todoPoints: number;
}

export function SprintPointsDialog({
  open,
  onOpenChange,
  projectKey,
  issues,
}: SprintPointsDialogProps) {
  const { data: sprints = [] } = useSprints(projectKey);
  const { data: projectMembers = [] } = useProjectMembers(projectKey);

  // Find active sprint by default, or the first sprint, or 'all'
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'ACTIVE') || sprints[0] || null;
  }, [sprints]);

  const [selectedSprintId, setSelectedSprintId] = useState<string | 'backlog' | 'all' | null>(null);

  // Effective sprint ID
  const currentSprintId = selectedSprintId ?? (activeSprint?.id || 'all');

  const selectedSprint = useMemo(() => {
    if (currentSprintId === 'all' || currentSprintId === 'backlog') return null;
    return sprints.find((s) => s.id === currentSprintId) || null;
  }, [sprints, currentSprintId]);

  // Filter issues according to selected sprint
  const sprintIssues = useMemo(() => {
    if (currentSprintId === 'all') {
      return issues.filter((i) => i.type !== 'EPIC');
    }
    if (currentSprintId === 'backlog') {
      return issues.filter((i) => !i.sprintId && !i.sprint_id && i.type !== 'EPIC');
    }
    return issues.filter(
      (i) => (i.sprintId === currentSprintId || i.sprint_id === currentSprintId) && i.type !== 'EPIC'
    );
  }, [issues, currentSprintId]);

  // Calculate workloads per user
  const { userWorkloads, unassignedWorkload, totalSprintPoints, totalSprintIssues } = useMemo(() => {
    const userMap: Record<string, UserWorkload> = {};

    // Initialize all project members so even members with 0 points are visible
    projectMembers.forEach((m) => {
      const u = m.user;
      if (u) {
        userMap[u.id] = {
          userId: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl || u.avatar_url,
          totalPoints: 0,
          issueCount: 0,
          donePoints: 0,
          inProgressPoints: 0,
          inReviewPoints: 0,
          todoPoints: 0,
        };
      }
    });

    const unassigned: UserWorkload = {
      userId: 'unassigned',
      name: 'Unassigned',
      totalPoints: 0,
      issueCount: 0,
      donePoints: 0,
      inProgressPoints: 0,
      inReviewPoints: 0,
      todoPoints: 0,
    };

    let totalPoints = 0;

    sprintIssues.forEach((issue) => {
      const points = issue.storyPoints ?? issue.story_points ?? 0;
      totalPoints += points;

      const assignee = issue.assignee;
      const assigneeId = issue.assigneeId || issue.assignee_id || assignee?.id;

      let target: UserWorkload;
      if (!assigneeId) {
        target = unassigned;
      } else {
        if (!userMap[assigneeId]) {
          userMap[assigneeId] = {
            userId: assigneeId,
            name: assignee?.name || 'Unknown User',
            email: assignee?.email,
            avatarUrl: assignee?.avatarUrl || assignee?.avatar_url,
            totalPoints: 0,
            issueCount: 0,
            donePoints: 0,
            inProgressPoints: 0,
            inReviewPoints: 0,
            todoPoints: 0,
          };
        }
        target = userMap[assigneeId];
      }

      target.totalPoints += points;
      target.issueCount += 1;

      if (issue.status === 'DONE') {
        target.donePoints += points;
      } else if (issue.status === 'IN_PROGRESS') {
        target.inProgressPoints += points;
      } else if (issue.status === 'IN_REVIEW') {
        target.inReviewPoints += points;
      } else {
        target.todoPoints += points;
      }
    });

    // Sort users: highest points first
    const sortedUsers = Object.values(userMap).sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      userWorkloads: sortedUsers,
      unassignedWorkload: unassigned,
      totalSprintPoints: totalPoints,
      totalSprintIssues: sprintIssues.length,
    };
  }, [sprintIssues, projectMembers]);

  // Overall completed points
  const completedPoints = useMemo(() => {
    return sprintIssues
      .filter((i) => i.status === 'DONE')
      .reduce((sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0), 0);
  }, [sprintIssues]);

  const completionPercentage = totalSprintPoints > 0
    ? Math.round((completedPoints / totalSprintPoints) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border/80 bg-card/95 backdrop-blur-md">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <BarChart2 size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Sprint Story Points by User
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Workload estimation and capacity breakdown across team members
                </DialogDescription>
              </div>
            </div>

            {/* Sprint Switcher Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="h-8 px-3 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer outline-none shadow-2xs shrink-0"
              >
                <Calendar size={13} className="text-primary" />
                <span className="truncate max-w-[160px]">
                  {selectedSprint
                    ? selectedSprint.name
                    : currentSprintId === 'backlog'
                    ? 'Backlog (No Sprint)'
                    : 'All Sprints Combined'}
                </span>
                <ChevronDown size={12} className="text-muted-foreground opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                {sprints.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => setSelectedSprintId(s.id)}
                    className="flex items-center justify-between text-xs py-2 px-2.5 cursor-pointer"
                  >
                    <span className="truncate font-medium">{s.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1 py-0 h-4 font-mono uppercase',
                        s.status === 'ACTIVE'
                          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                          : 'text-muted-foreground'
                      )}
                    >
                      {s.status}
                    </Badge>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => setSelectedSprintId('backlog')}
                  className="text-xs py-2 px-2.5 cursor-pointer text-muted-foreground font-medium"
                >
                  Backlog (Unassigned to Sprint)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedSprintId('all')}
                  className="text-xs py-2 px-2.5 cursor-pointer text-muted-foreground font-medium"
                >
                  All Current Issues
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                Total Story Points
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">
                  {totalSprintPoints}
                </span>
                <span className="text-[10px] text-muted-foreground">pts</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                Completed
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {completedPoints}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  / {totalSprintPoints} ({completionPercentage}%)
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                Total Tickets
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">
                  {totalSprintIssues}
                </span>
                <span className="text-[10px] text-muted-foreground">tickets</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                Team Members
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-foreground">
                  {userWorkloads.filter((u) => u.totalPoints > 0 || u.issueCount > 0).length}
                </span>
                <span className="text-[10px] text-muted-foreground">assigned</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Workload List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {userWorkloads.length === 0 && unassignedWorkload.issueCount === 0 ? (
            <div className="py-12 text-center border border-dashed border-border/80 rounded-xl bg-muted/10">
              <HelpCircle size={28} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold text-foreground">No tickets in this sprint</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add story points and assign tickets to team members to see workload distribution.
              </p>
            </div>
          ) : (
            <>
              {/* Member Workload Cards */}
              {userWorkloads.map((workload) => {
                const userInitial = workload.name.charAt(0).toUpperCase();
                const sharePercent = totalSprintPoints > 0
                  ? Math.round((workload.totalPoints / totalSprintPoints) * 100)
                  : 0;

                return (
                  <div
                    key={workload.userId}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/60 hover:bg-card/90 transition-colors space-y-2.5 shadow-2xs"
                  >
                    {/* Top Row: User metadata and points */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size="sm" className="h-7 w-7 ring-1 ring-border shrink-0">
                          {workload.avatarUrl ? (
                            <AvatarImage src={workload.avatarUrl} alt={workload.name} />
                          ) : (
                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                              {userInitial}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {workload.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {workload.issueCount} ticket{workload.issueCount !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      </div>

                      {/* Points badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-foreground">
                            {workload.totalPoints}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-0.5 font-medium">pts</span>
                          <span className="text-[10px] text-muted-foreground/70 block">
                            {sharePercent}% of sprint
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="h-6 px-2 text-xs font-mono font-bold rounded-lg bg-primary/10 text-primary border border-primary/20"
                        >
                          {workload.totalPoints} pts
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar with Status Segmentation */}
                    {workload.totalPoints > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex">
                          {workload.donePoints > 0 && (
                            <div
                              style={{ width: `${(workload.donePoints / workload.totalPoints) * 100}%` }}
                              className="bg-emerald-500 h-full transition-all"
                              title={`Done: ${workload.donePoints} pts`}
                            />
                          )}
                          {workload.inProgressPoints > 0 && (
                            <div
                              style={{ width: `${(workload.inProgressPoints / workload.totalPoints) * 100}%` }}
                              className="bg-blue-500 h-full transition-all"
                              title={`In Progress: ${workload.inProgressPoints} pts`}
                            />
                          )}
                          {workload.inReviewPoints > 0 && (
                            <div
                              style={{ width: `${(workload.inReviewPoints / workload.totalPoints) * 100}%` }}
                              className="bg-amber-500 h-full transition-all"
                              title={`In Review: ${workload.inReviewPoints} pts`}
                            />
                          )}
                          {workload.todoPoints > 0 && (
                            <div
                              style={{ width: `${(workload.todoPoints / workload.totalPoints) * 100}%` }}
                              className="bg-slate-400 dark:bg-zinc-600 h-full transition-all"
                              title={`To Do: ${workload.todoPoints} pts`}
                            />
                          )}
                        </div>

                        {/* Status Legend Pills */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap pt-0.5">
                          {workload.donePoints > 0 && (
                            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Done: {workload.donePoints} pts
                            </span>
                          )}
                          {workload.inProgressPoints > 0 && (
                            <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              In Progress: {workload.inProgressPoints} pts
                            </span>
                          )}
                          {workload.inReviewPoints > 0 && (
                            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Review: {workload.inReviewPoints} pts
                            </span>
                          )}
                          {workload.todoPoints > 0 && (
                            <span className="flex items-center gap-1 font-medium text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                              To Do: {workload.todoPoints} pts
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned Issues Card (if any tickets lack assignees) */}
              {unassignedWorkload.issueCount > 0 && (
                <div className="p-3.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full border border-dashed border-amber-500/60 flex items-center justify-center text-xs text-amber-600 dark:text-amber-400 font-bold">
                        ?
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Unassigned Tickets
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {unassignedWorkload.issueCount} ticket{unassignedWorkload.issueCount !== 1 ? 's' : ''} not yet assigned to any member
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-6 px-2 text-xs font-mono font-bold rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                    >
                      {unassignedWorkload.totalPoints} pts
                    </Badge>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
