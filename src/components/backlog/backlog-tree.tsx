'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Issue, IssuePriority, IssueStatus } from '@/types/issue';
import { IssueRow } from './issue-row';
import { useIssueModal } from '@/context/issue-modal-context';
import {
  useDeleteIssueMutation,
  useUpdateIssueMutation,
  useSprints,
  useBulkMoveSprintMutation,
} from '@/hooks/use-issues';
import { cn } from '@/lib/utils';

interface BacklogTreeProps {
  issues: Issue[];
  selectedEpicId: string | null;
  projectKey?: string;
}

export function BacklogTree({
  issues,
  selectedEpicId,
  projectKey = 'TYK',
}: BacklogTreeProps) {
  const { openEditModal, openCreateModal } = useIssueModal();

  // Expansion tracking: issueId -> boolean
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isExpanded = useCallback(
    (id: string) => {
      return expandedMap[id] !== false; // default expanded
    },
    [expandedMap]
  );

  // Live mutations hooked to Go backend
  const updateMutation = useUpdateIssueMutation(projectKey);
  const deleteMutation = useDeleteIssueMutation(projectKey);
  const { data: sprints = [] } = useSprints(projectKey);
  const bulkMoveMutation = useBulkMoveSprintMutation(projectKey);

  const handleSprintChange = (id: string, sprintId: string | null) => {
    bulkMoveMutation.mutate({ issue_ids: [id], sprint_id: sprintId });
  };

  // Helper maps for building hierarchy
  const { epics, childrenByParentId, unparentedIssues } = useMemo(() => {
    const epicsList: Issue[] = [];
    const childrenMap: Record<string, Issue[]> = {};
    const unparented: Issue[] = [];

    issues.forEach((iss) => {
      const pId = iss.parentId || iss.parent_id;
      if (iss.type === 'EPIC') {
        epicsList.push(iss);
      } else if (pId) {
        if (!childrenMap[pId]) {
          childrenMap[pId] = [];
        }
        childrenMap[pId].push(iss);
      } else {
        unparented.push(iss);
      }
    });

    return {
      epics: epicsList,
      childrenByParentId: childrenMap,
      unparentedIssues: unparented,
    };
  }, [issues]);

  // Filtered epics if an epic filter is active
  const displayedEpics = useMemo(() => {
    if (selectedEpicId) {
      return epics.filter((e) => e.id === selectedEpicId);
    }
    return epics;
  }, [epics, selectedEpicId]);

  // Top-level standalone issues (only shown when no epic filter is active, or if matching)
  const displayedUnparented = useMemo(() => {
    if (selectedEpicId) return [];
    return unparentedIssues;
  }, [unparentedIssues, selectedEpicId]);

  // Precompute stable 0..N-1 indexes for rendered Draggables
  const issueIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;

    displayedEpics.forEach((epic) => {
      map.set(epic.id, idx++);
      const epicChildren = childrenByParentId[epic.id] || [];
      if (isExpanded(epic.id)) {
        epicChildren.forEach((child) => {
          map.set(child.id, idx++);
          const subtasks = childrenByParentId[child.id] || [];
          if (isExpanded(child.id)) {
            subtasks.forEach((subtask) => {
              map.set(subtask.id, idx++);
            });
          }
        });
      }
    });

    displayedUnparented.forEach((issue) => {
      map.set(issue.id, idx++);
      const subtasks = childrenByParentId[issue.id] || [];
      if (isExpanded(issue.id)) {
        subtasks.forEach((subtask) => {
          map.set(subtask.id, idx++);
        });
      }
    });

    return map;
  }, [displayedEpics, displayedUnparented, childrenByParentId, isExpanded]);

  const handleTitleChange = (id: string, newTitle: string) => {
    updateMutation.mutate({ id, data: { title: newTitle } });
  };

  const handleStatusChange = (id: string, newStatus: IssueStatus) => {
    updateMutation.mutate({ id, data: { status: newStatus } });
  };

  const handlePriorityChange = (id: string, newPriority: IssuePriority) => {
    updateMutation.mutate({ id, data: { priority: newPriority } });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleAddChild = (parentId: string) => {
    const parent = issues.find((i) => i.id === parentId);
    if (parent?.type === 'EPIC') {
      openCreateModal({ parentId, type: 'STORY' });
    } else {
      openCreateModal({ parentId, type: 'SUBTASK' });
    }
  };

  // Helper to render a draggable issue row
  const renderDraggableRow = (
    issue: Issue,
    level: number,
    options: {
      hasChildren?: boolean;
      isExpanded?: boolean;
      onToggleExpand?: () => void;
      onAddChild?: (id: string) => void;
    } = {}
  ) => {
    const index = issueIndexMap.get(issue.id) ?? 0;

    return (
      <Draggable key={issue.id} draggableId={issue.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              'transition-shadow',
              snapshot.isDragging &&
                'bg-card/95 shadow-2xl ring-2 ring-primary/50 rounded-md z-50 select-none opacity-95'
            )}
          >
            <IssueRow
              issue={issue}
              level={level}
              hasChildren={options.hasChildren}
              isExpanded={options.isExpanded}
              sprints={sprints}
              dragHandleProps={provided.dragHandleProps}
              onToggleExpand={options.onToggleExpand}
              onTitleChange={handleTitleChange}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onSprintChange={handleSprintChange}
              onDelete={handleDelete}
              onAddChild={options.onAddChild}
              onClick={openEditModal}
            />
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Table-like header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span>Hierarchy & Issue</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-5 pr-10">
          <span className="w-16 text-center">Status</span>
          <span className="w-20 text-center">Sprint</span>
          <span className="w-10 text-center">Priority</span>
          <span className="w-8 text-center">Pts</span>
          <span className="w-6 text-center">User</span>
        </div>
      </div>

      <Droppable droppableId="backlog-tree">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="divide-y divide-border/20"
          >
            {/* Render Epics and their hierarchical children */}
            {displayedEpics.map((epic) => {
              const epicChildren = childrenByParentId[epic.id] || [];
              const hasEpicChildren = epicChildren.length > 0;
              const epicExpanded = isExpanded(epic.id);

              return (
                <React.Fragment key={epic.id}>
                  {/* Level 0: Epic */}
                  {renderDraggableRow(epic, 0, {
                    hasChildren: hasEpicChildren,
                    isExpanded: epicExpanded,
                    onToggleExpand: () => toggleExpand(epic.id),
                    onAddChild: handleAddChild,
                  })}

                  {/* Children of Epic (Stories / Tasks) */}
                  {epicExpanded &&
                    epicChildren.map((child) => {
                      const subtasks = childrenByParentId[child.id] || [];
                      const hasSubtasks = subtasks.length > 0;
                      const childExpanded = isExpanded(child.id);

                      return (
                        <React.Fragment key={child.id}>
                          {/* Level 1: Story / Task */}
                          {renderDraggableRow(child, 1, {
                            hasChildren: hasSubtasks,
                            isExpanded: childExpanded,
                            onToggleExpand: () => toggleExpand(child.id),
                            onAddChild: handleAddChild,
                          })}

                          {/* Level 2: Subtasks */}
                          {childExpanded &&
                            subtasks.map((subtask) => renderDraggableRow(subtask, 2))}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {/* Unparented Standalone Issues (Stories, Tasks, Bugs) */}
            {displayedUnparented.map((issue) => {
              const subtasks = childrenByParentId[issue.id] || [];
              const hasSubtasks = subtasks.length > 0;
              const issueExpanded = isExpanded(issue.id);

              return (
                <React.Fragment key={issue.id}>
                  {renderDraggableRow(issue, 0, {
                    hasChildren: hasSubtasks,
                    isExpanded: issueExpanded,
                    onToggleExpand: () => toggleExpand(issue.id),
                    onAddChild: handleAddChild,
                  })}

                  {/* Subtasks under standalone task */}
                  {issueExpanded &&
                    subtasks.map((subtask) => renderDraggableRow(subtask, 1))}
                </React.Fragment>
              );
            })}

            {displayedEpics.length === 0 && displayedUnparented.length === 0 && (
              <div className="py-16 text-center text-muted-foreground text-sm">
                No issues found matching the selected filter.
              </div>
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

