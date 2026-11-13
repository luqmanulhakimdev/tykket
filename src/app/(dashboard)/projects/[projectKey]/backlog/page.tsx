'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useIssues, useSprints, useBulkMoveSprintMutation } from '@/hooks/use-issues';
import { IssuePriority, IssueType } from '@/types/issue';
import { EpicPanel } from '@/components/backlog/epic-panel';
import { BacklogTree } from '@/components/backlog/backlog-tree';
import { BacklogToolbar } from '@/components/backlog/backlog-toolbar';
import { SprintPointsDialog } from '@/components/backlog/sprint-points-dialog';
import { SprintManagerCard } from '@/components/backlog/sprint-manager-card';
import { useIssueModal } from '@/context/issue-modal-context';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';

export default function BacklogPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectKey = (params?.projectKey as string) || 'TYK';
  const { openCreateModal } = useIssueModal();
  const { user } = useAuth();

  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [isSprintPointsOpen, setIsSprintPointsOpen] = useState(false);

  // Fetch issues & sprints from live Go backend
  const { data: issues = [] } = useIssues(projectKey);
  const { data: sprints = [] } = useSprints(projectKey);
  const bulkMoveMutation = useBulkMoveSprintMutation(projectKey);

  // Parse filters from URL search params (consistent with Kanban board)
  const search = searchParams?.get('search') || '';
  const typeParam = searchParams?.get('type') || '';
  const types: IssueType[] = useMemo(() => {
    return typeParam ? (typeParam.split(',') as IssueType[]) : [];
  }, [typeParam]);
  const priority = (searchParams?.get('priority') || 'ALL') as IssuePriority | 'ALL';
  const assignee = searchParams?.get('assignee') || null;

  // Active sprint for points preview badge
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'ACTIVE') || sprints[0] || null;
  }, [sprints]);

  const totalActiveSprintPoints = useMemo(() => {
    if (!activeSprint) return 0;
    return issues
      .filter(
        (i) =>
          (i.sprintId === activeSprint.id || i.sprint_id === activeSprint.id) &&
          i.type !== 'EPIC'
      )
      .reduce((sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0), 0);
  }, [issues, activeSprint]);

  // Epics list for EpicPanel
  const epics = useMemo(() => {
    return issues.filter((iss) => iss.type === 'EPIC');
  }, [issues]);

  // Apply complete filters (Search, Type, Priority, Assignee)
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesTitle = iss.title.toLowerCase().includes(q);
        const matchesKey = iss.key.toLowerCase().includes(q);
        if (!matchesTitle && !matchesKey) return false;
      }

      // 2. Types Filter
      if (types.length > 0) {
        if (!types.includes(iss.type)) return false;
      }

      // 3. Priority Filter
      if (priority && priority !== 'ALL') {
        if (iss.priority !== priority) return false;
      }

      // 4. Assignee Filter
      if (assignee) {
        const currentId = user?.id;
        const issAssigneeId = iss.assigneeId || iss.assignee_id || iss.assignee?.id;
        if (assignee === 'unassigned') {
          if (issAssigneeId) return false;
        } else if (assignee === 'me') {
          if (!currentId || issAssigneeId !== currentId) return false;
        } else {
          if (issAssigneeId !== assignee) return false;
        }
      }

      return true;
    });
  }, [issues, search, types, priority, assignee, user?.id]);

  // Ensure hierarchical tree integrity: include parent epics/stories of matching issues
  const treeIssues = useMemo(() => {
    const matchingIds = new Set(filteredIssues.map((i) => i.id));
    filteredIssues.forEach((iss) => {
      if (iss.parentId) matchingIds.add(iss.parentId);
      if (iss.parent_id) matchingIds.add(iss.parent_id);
    });
    return issues.filter((i) => matchingIds.has(i.id));
  }, [issues, filteredIssues]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // Dropped in the same spot
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const destId = destination.droppableId;
    const srcId = source.droppableId;

    // 1. Dropped into a Sprint target
    if (destId.startsWith('sprint-')) {
      const targetSprintId = destId.replace('sprint-', '');

      // Check if already in this sprint
      const movedIssue = issues.find((i) => i.id === draggableId);
      const currentSprintId = movedIssue?.sprintId || movedIssue?.sprint_id;
      if (currentSprintId === targetSprintId) {
        return;
      }

      bulkMoveMutation.mutate({
        issue_ids: [draggableId],
        sprint_id: targetSprintId,
      });
      return;
    }

    // 2. Dropped back into backlog-tree from a sprint (moves to backlog)
    if (destId === 'backlog-tree' && srcId !== 'backlog-tree') {
      bulkMoveMutation.mutate({
        issue_ids: [draggableId],
        sprint_id: null,
      });
      return;
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Title Bar */}
        <div className="px-6 py-3.5 border-b border-border/60 bg-card/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Project Backlog
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-muted-foreground uppercase">
                {projectKey}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hierarchical Epic & Story backlog planning with agile capacity tracking
            </p>
          </div>
        </div>

        {/* Comprehensive Filter Toolbar */}
        <BacklogToolbar
          projectKey={projectKey}
          totalCount={issues.length}
          filteredCount={filteredIssues.length}
          totalSprintPoints={totalActiveSprintPoints}
          onOpenSprintPoints={() => setIsSprintPointsOpen(true)}
          onOpenCreateIssue={() => openCreateModal({ status: 'BACKLOG' })}
        />

        {/* Sprints Overview & Management (Active Sprint, Planned Sprints, Start/Create Sprint) */}
        <SprintManagerCard
          projectKey={projectKey}
          sprints={sprints}
          issues={issues}
        />

        {/* Main Backlog Layout: Left Epic Panel + Right Backlog Tree */}
        <div className="flex-1 flex overflow-hidden">
          {/* Collapsible Epic Panel */}
          <EpicPanel
            epics={epics}
            issues={issues}
            selectedEpicId={selectedEpicId}
            onSelectEpic={setSelectedEpicId}
            onCreateEpic={() => openCreateModal({ type: 'EPIC', status: 'TODO' })}
          />

          {/* Backlog Tree Content */}
          <BacklogTree
            issues={treeIssues}
            selectedEpicId={selectedEpicId}
            projectKey={projectKey}
          />
        </div>

        {/* Sprint Story Points by User Workload Dialog */}
        <SprintPointsDialog
          open={isSprintPointsOpen}
          onOpenChange={setIsSprintPointsOpen}
          projectKey={projectKey}
          issues={issues}
        />
      </div>
    </DragDropContext>
  );
}
