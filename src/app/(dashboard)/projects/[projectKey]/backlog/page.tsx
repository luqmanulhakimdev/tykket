'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useIssues } from '@/hooks/use-issues';
import { EpicPanel } from '@/components/backlog/epic-panel';
import { BacklogTree } from '@/components/backlog/backlog-tree';
import { useIssueModal } from '@/context/issue-modal-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';

export default function BacklogPage() {
  const params = useParams();
  const projectKey = (params?.projectKey as string) || 'TYK';
  const { openCreateModal } = useIssueModal();

  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch issues from live Go backend
  const { data: issues = [] } = useIssues(projectKey);

  // Epics list
  const epics = useMemo(() => {
    return issues.filter((iss) => iss.type === 'EPIC');
  }, [issues]);

  // Filtered issues according to search query
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues;
    const query = searchQuery.toLowerCase();
    return issues.filter(
      (iss) =>
        iss.title.toLowerCase().includes(query) ||
        iss.key.toLowerCase().includes(query)
    );
  }, [issues, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Backlog Header Bar */}
      <div className="px-6 py-4 border-b border-border/60 bg-card/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
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
            Hierarchical Epic & Story backlog planning with inline updates
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Quick Search */}
          <div className="relative w-48 sm:w-60">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter backlog..."
              className="h-8 pl-8 text-xs bg-muted/20"
            />
          </div>

          <Button
            size="sm"
            onClick={() => openCreateModal({ status: 'BACKLOG' })}
            className="h-8 px-3 text-xs gap-1 font-semibold"
          >
            <Plus size={14} />
            <span>Add Backlog Issue</span>
          </Button>
        </div>
      </div>

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
          issues={filteredIssues}
          selectedEpicId={selectedEpicId}
          projectKey={projectKey}
        />
      </div>
    </div>
  );
}

