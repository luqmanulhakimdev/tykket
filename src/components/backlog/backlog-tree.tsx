'use client';

import React, { useState, useMemo } from 'react';
import { Issue, IssuePriority, IssueStatus } from '@/types/issue';
import { IssueRow } from './issue-row';
import { useIssueModal } from '@/context/issue-modal-context';
import { useDeleteIssueMutation, useUpdateIssueMutation } from '@/hooks/use-issues';

interface BacklogTreeProps {
  issues: Issue[];
  selectedEpicId: string | null;
  projectKey?: string;
}

export function BacklogTree({ issues, selectedEpicId, projectKey = 'TYK' }: BacklogTreeProps) {
  const { openEditModal, openCreateModal } = useIssueModal();

  // Expansion tracking: issueId -> boolean
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isExpanded = (id: string) => {
    return expandedMap[id] !== false; // default expanded
  };

  // Live mutations hooked to Go backend
  const updateMutation = useUpdateIssueMutation(projectKey);
  const deleteMutation = useDeleteIssueMutation(projectKey);

  // Helper maps for building hierarchy
  const { epics, childrenByParentId, unparentedIssues } = useMemo(() => {
    const epicsList: Issue[] = [];
    const childrenMap: Record<string, Issue[]> = {};
    const unparented: Issue[] = [];

    issues.forEach((iss) => {
      if (iss.type === 'EPIC') {
        epicsList.push(iss);
      } else if (iss.parentId) {
        if (!childrenMap[iss.parentId]) {
          childrenMap[iss.parentId] = [];
        }
        childrenMap[iss.parentId].push(iss);
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

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Table-like header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span>Hierarchy & Issue</span>
        </div>
        <div className="flex items-center gap-8 pr-12">
          <span>Status</span>
          <span>Priority</span>
          <span>Assignee</span>
        </div>
      </div>

      <div className="divide-y divide-border/20">
        {/* Render Epics and their hierarchical children */}
        {displayedEpics.map((epic) => {
          const epicChildren = childrenByParentId[epic.id] || [];
          const hasEpicChildren = epicChildren.length > 0;
          const epicExpanded = isExpanded(epic.id);

          return (
            <div key={epic.id} className="border-b border-border/40">
              {/* Level 0: Epic */}
              <IssueRow
                issue={epic}
                level={0}
                hasChildren={hasEpicChildren}
                isExpanded={epicExpanded}
                onToggleExpand={() => toggleExpand(epic.id)}
                onTitleChange={handleTitleChange}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                onClick={openEditModal}
              />

              {/* Children of Epic (Stories / Tasks) */}
              {epicExpanded &&
                epicChildren.map((child) => {
                  const subtasks = childrenByParentId[child.id] || [];
                  const hasSubtasks = subtasks.length > 0;
                  const childExpanded = isExpanded(child.id);

                  return (
                    <React.Fragment key={child.id}>
                      {/* Level 1: Story / Task */}
                      <IssueRow
                        issue={child}
                        level={1}
                        hasChildren={hasSubtasks}
                        isExpanded={childExpanded}
                        onToggleExpand={() => toggleExpand(child.id)}
                        onTitleChange={handleTitleChange}
                        onStatusChange={handleStatusChange}
                        onPriorityChange={handlePriorityChange}
                        onDelete={handleDelete}
                        onAddChild={handleAddChild}
                        onClick={openEditModal}
                      />

                      {/* Level 2: Subtasks */}
                      {childExpanded &&
                        subtasks.map((subtask) => (
                          <IssueRow
                            key={subtask.id}
                            issue={subtask}
                            level={2}
                            hasChildren={false}
                            onTitleChange={handleTitleChange}
                            onStatusChange={handleStatusChange}
                            onPriorityChange={handlePriorityChange}
                            onDelete={handleDelete}
                            onClick={openEditModal}
                          />
                        ))}
                    </React.Fragment>
                  );
                })}
            </div>
          );
        })}

        {/* Unparented Standalone Issues (Stories, Tasks, Bugs) */}
        {displayedUnparented.map((issue) => {
          const subtasks = childrenByParentId[issue.id] || [];
          const hasSubtasks = subtasks.length > 0;
          const issueExpanded = isExpanded(issue.id);

          return (
            <div key={issue.id} className="border-b border-border/40">
              <IssueRow
                issue={issue}
                level={0}
                hasChildren={hasSubtasks}
                isExpanded={issueExpanded}
                onToggleExpand={() => toggleExpand(issue.id)}
                onTitleChange={handleTitleChange}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                onClick={openEditModal}
              />

              {/* Subtasks under standalone task */}
              {issueExpanded &&
                subtasks.map((subtask) => (
                  <IssueRow
                    key={subtask.id}
                    issue={subtask}
                    level={1}
                    hasChildren={false}
                    onTitleChange={handleTitleChange}
                    onStatusChange={handleStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onDelete={handleDelete}
                    onClick={openEditModal}
                  />
                ))}
            </div>
          );
        })}

        {displayedEpics.length === 0 && displayedUnparented.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No issues found matching the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}

