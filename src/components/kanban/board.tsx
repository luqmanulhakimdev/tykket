'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Column, IssuePriority, IssueStatus, IssueType } from '@/types/issue';
import { calculateNewPosition } from '@/lib/fractional-index';
import { KanbanColumn } from './column';
import { useIssueModal } from '@/context/issue-modal-context';
import { useIssues, useMoveIssueMutation } from '@/hooks/use-issues';
import { useIssueRealtime } from '@/hooks/use-issue-realtime';
import { useAuth } from '@/context/auth-context';

const KANBAN_STATUSES: { id: IssueStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
];

interface KanbanBoardProps {
  projectKey?: string;
  onCountsChange?: (total: number, filtered: number) => void;
}

export function KanbanBoard({ projectKey = 'TYK', onCountsChange }: KanbanBoardProps) {
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const { openEditModal, openCreateModal } = useIssueModal();

  // Load issues and move mutation with hardened rollback + optimistic updates
  const { data: issues = [] } = useIssues(projectKey);
  const moveMutation = useMoveIssueMutation(projectKey);

  // Real-time synchronization via SSE / WebSocket
  useIssueRealtime({ projectKey });

  // Filters from URL Search Params
  const searchQuery = searchParams?.get('search')?.toLowerCase().trim() || '';
  const typeParam = searchParams?.get('type') || '';
  const types: IssueType[] = useMemo(
    () => (typeParam ? (typeParam.split(',') as IssueType[]) : []),
    [typeParam]
  );
  const priority = (searchParams?.get('priority') as IssuePriority | 'ALL') || 'ALL';
  const assignee = searchParams?.get('assignee') || null;

  // Filter issues without mutating original list
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Text Search
      if (searchQuery) {
        const matchesKey = issue.key.toLowerCase().includes(searchQuery);
        const matchesTitle = issue.title.toLowerCase().includes(searchQuery);
        const matchesDesc = issue.description?.toLowerCase().includes(searchQuery);
        if (!matchesKey && !matchesTitle && !matchesDesc) return false;
      }

      // 2. Type Filter
      if (types.length > 0 && !types.includes(issue.type)) {
        return false;
      }

      // 3. Priority Filter
      if (priority && priority !== 'ALL' && issue.priority !== priority) {
        return false;
      }

      // 4. Assignee Filter
      if (assignee) {
        const targetUserId = assignee === 'me' ? currentUser?.id : assignee;
        if (targetUserId && issue.assignee?.id !== targetUserId) {
          return false;
        }
      }

      return true;
    });
  }, [issues, searchQuery, types, priority, assignee, currentUser?.id]);

  // Report counts to parent if callback provided
  React.useEffect(() => {
    onCountsChange?.(issues.length, filteredIssues.length);
  }, [issues.length, filteredIssues.length, onCountsChange]);

  // Group issues into the 4 kanban columns, sorted by position ascending
  const columns: Column[] = useMemo(() => {
    return KANBAN_STATUSES.map(({ id, title }) => {
      const colIssues = filteredIssues
        .filter((issue) => issue.status === id)
        .sort((a, b) => a.position - b.position);
      return {
        id,
        title,
        issues: colIssues,
      };
    });
  }, [filteredIssues]);

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

    const destStatus = destination.droppableId as IssueStatus;

    // Find the dragged issue
    const movedIssue = issues.find((iss) => iss.id === draggableId);
    if (!movedIssue) return;

    // Visible issues in destination column excluding the moving issue
    const destColumnIssues = filteredIssues
      .filter((iss) => iss.status === destStatus && iss.id !== draggableId)
      .sort((a, b) => a.position - b.position);

    // Calculate new fractional index position
    let newPosition: number;

    if (destColumnIssues.length === 0) {
      newPosition = calculateNewPosition();
    } else if (destination.index === 0) {
      // Top of column
      const nextPos = destColumnIssues[0].position;
      newPosition = calculateNewPosition(undefined, nextPos);
    } else if (destination.index >= destColumnIssues.length) {
      // Bottom of column
      const prevPos = destColumnIssues[destColumnIssues.length - 1].position;
      newPosition = calculateNewPosition(prevPos, undefined);
    } else {
      // Between two cards
      const prevPos = destColumnIssues[destination.index - 1].position;
      const nextPos = destColumnIssues[destination.index].position;
      newPosition = calculateNewPosition(prevPos, nextPos);
    }

    // Trigger hardened mutation (optimistic update + rollback on error)
    moveMutation.mutate({
      id: draggableId,
      status: destStatus,
      position: newPosition,
    });
  };

  return (
    <div className="h-full w-full overflow-x-auto pb-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex h-full gap-4 items-start min-w-max pb-2">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCardClick={(issue) => openEditModal(issue)}
              onAddClick={(status) => openCreateModal({ status })}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
