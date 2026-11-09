'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  useTrashIssues,
  useRestoreIssueMutation,
  usePermanentDeleteMutation,
} from '@/hooks/use-issues';
import { Issue } from '@/types/issue';
import { IssueTypeIcon } from '@/components/issues/issue-type-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export default function TrashPage() {
  const params = useParams();
  const projectKey = (params?.projectKey as string) || 'TYK';

  const { data: trashIssues = [], isLoading } = useTrashIssues(projectKey);
  const restoreMutation = useRestoreIssueMutation(projectKey);
  const permanentDeleteMutation = usePermanentDeleteMutation(projectKey);

  const [search, setSearch] = useState('');
  const [issueToPermanentlyDelete, setIssueToPermanentlyDelete] = useState<Issue | null>(null);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    if (!search.trim()) return trashIssues;
    const q = search.toLowerCase().trim();
    return trashIssues.filter(
      (iss) =>
        iss.key.toLowerCase().includes(q) ||
        iss.title.toLowerCase().includes(q)
    );
  }, [trashIssues, search]);

  const handleRestore = (issue: Issue) => {
    restoreMutation.mutate(issue.id);
  };

  const handleConfirmPermanentDelete = () => {
    if (issueToPermanentlyDelete) {
      permanentDeleteMutation.mutate(issueToPermanentlyDelete.id);
      setIssueToPermanentlyDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-border/60 bg-card/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trash2 className="text-muted-foreground" size={20} />
              Trash Bin
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground uppercase">
              {projectKey}
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              {trashIssues.length} items
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Soft-deleted issues backed by database <code className="text-[11px] font-mono bg-muted px-1 rounded">deleted_at</code> timestamps. Restore anytime or permanently delete.
          </p>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted issues..."
            className="h-8 pl-8 text-xs bg-muted/20"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border/70 rounded-xl overflow-hidden bg-card/40 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Key & Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Deleted At</th>
                <th className="py-3 px-4">Deleted By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredIssues.map((issue) => (
                <tr
                  key={issue.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Key & Title */}
                  <td className="py-3 px-4 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-muted-foreground shrink-0">
                        {issue.key}
                      </span>
                      <span className="font-medium text-foreground truncate">
                        {issue.title}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <IssueTypeIcon type={issue.type} size={14} />
                      <span className="capitalize">{issue.type.toLowerCase()}</span>
                    </div>
                  </td>

                  {/* Deleted At */}
                  <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-muted-foreground/70" />
                      <span>
                        {issue.deletedAt
                          ? new Date(issue.deletedAt).toLocaleString()
                          : 'Recent'}
                      </span>
                    </div>
                  </td>

                  {/* Deleted By */}
                  <td className="py-3 px-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {issue.deletedBy ? (
                        <>
                          <Avatar size="sm" className="h-5 w-5">
                            {issue.deletedBy.avatarUrl ? (
                              <AvatarImage src={issue.deletedBy.avatarUrl} alt={issue.deletedBy.name} />
                            ) : (
                              <AvatarFallback className="text-[9px]">{issue.deletedBy.name[0]}</AvatarFallback>
                            )}
                          </Avatar>
                          <span className="truncate">{issue.deletedBy.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(issue)}
                        disabled={restoreMutation.isPending}
                        className="h-7 px-2 text-xs gap-1 font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                        title="Restore issue to board"
                      >
                        <RotateCcw size={12} />
                        <span>Restore</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIssueToPermanentlyDelete(issue)}
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                        title="Permanently remove from database"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredIssues.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Trash2 size={24} className="text-muted-foreground/40" />
                      <p className="font-medium text-xs">
                        {search ? 'No matching issues found in trash' : 'Trash bin is completely empty'}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Issues soft-deleted from Kanban or Backlog will be held here safely.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Permanent Deletion */}
      <Dialog
        open={Boolean(issueToPermanentlyDelete)}
        onOpenChange={(open) => !open && setIssueToPermanentlyDelete(null)}
      >
        <DialogContent className="max-w-md sm:max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle size={18} />
              <DialogTitle className="text-base">Permanent Deletion</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground font-mono">{issueToPermanentlyDelete?.key}</strong> (
              {issueToPermanentlyDelete?.title})? This will hard-delete the record from PostgreSQL
              and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIssueToPermanentlyDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmPermanentDelete}
              disabled={permanentDeleteMutation.isPending}
              className="text-xs font-semibold gap-1"
            >
              <Trash2 size={13} />
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
