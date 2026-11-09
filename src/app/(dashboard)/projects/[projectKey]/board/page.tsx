'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { KanbanBoard } from '@/components/kanban/board';
import { BoardToolbar } from '@/components/kanban/board-toolbar';
import { Badge } from '@/components/ui/badge';

export default function BoardPage() {
  const params = useParams();
  const projectKey = (params?.projectKey as string) || 'TYK';

  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-3.5">
      {/* Board Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Kanban Board
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground uppercase">
              {projectKey}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time drag and drop issue lifecycle tracking with fractional reindexing
          </p>
        </div>
      </div>

      {/* Board Filtering & Search Toolbar (Syncs with URL query params) */}
      <div className="shrink-0">
        <BoardToolbar
          totalIssuesCount={totalCount}
          filteredIssuesCount={filteredCount}
        />
      </div>

      {/* Main Kanban Board Canvas */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <KanbanBoard
          projectKey={projectKey}
          onCountsChange={(total, filtered) => {
            setTotalCount(total);
            setFilteredCount(filtered);
          }}
        />
      </div>
    </div>
  );
}
