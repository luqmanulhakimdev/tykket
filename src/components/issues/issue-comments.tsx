'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import {
  useComments,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from '@/hooks/use-issues';
import { Comment } from '@/types/issue';
import { cn } from '@/lib/utils';

interface IssueCommentsProps {
  issueId: string;
  issueKey?: string;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 30) return 'just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
}

export function IssueComments({ issueId, className }: IssueCommentsProps) {
  const { user: currentUser } = useAuth();
  const { data: comments = [], isLoading } = useComments(issueId);

  const createMutation = useCreateCommentMutation(issueId);
  const updateMutation = useUpdateCommentMutation(issueId);
  const deleteMutation = useDeleteCommentMutation(issueId);

  const [newComment, setNewComment] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = newComment.trim();
    if (!content || createMutation.isPending) return;

    await createMutation.mutateAsync(content);
    setNewComment('');
    setIsInputFocused(false);
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditingContent(comment.content);
    setDeletingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (commentId: string) => {
    const content = editingContent.trim();
    if (!content || updateMutation.isPending) return;

    await updateMutation.mutateAsync({ commentId, content });
    setEditingId(null);
    setEditingContent('');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deleteMutation.isPending) return;
    await deleteMutation.mutateAsync(commentId);
    setDeletingId(null);
  };

  const currentUserName = currentUser?.name || 'You';
  const currentUserInitial = currentUserName.charAt(0).toUpperCase();

  return (
    <div className={cn('space-y-4 pt-4 border-t border-border/70', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Comments & Discussion
          </h3>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[11px] font-mono font-medium rounded-full"
          >
            {comments.length}
          </Badge>
        </div>
      </div>

      {/* New Comment Input Box */}
      <form onSubmit={handleCreateComment} className="flex items-start gap-3">
        <Avatar size="sm" className="h-7 w-7 mt-0.5 shrink-0 ring-1 ring-border">
          {currentUser?.avatarUrl || currentUser?.avatar_url ? (
            <AvatarImage
              src={currentUser.avatarUrl || currentUser.avatar_url}
              alt={currentUserName}
            />
          ) : (
            <AvatarFallback className="text-[11px] font-medium bg-primary/10 text-primary">
              {currentUserInitial}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 space-y-2">
          <div
            className={cn(
              'rounded-xl border border-border/80 bg-background/80 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all p-2.5',
              isInputFocused && 'shadow-xs border-primary/50'
            )}
          >
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              placeholder="Add a comment... (Ctrl + Enter to send)"
              rows={isInputFocused || newComment ? 3 : 2}
              className="w-full bg-transparent text-xs leading-relaxed outline-none resize-none placeholder:text-muted-foreground/70"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateComment();
                }
              }}
            />

            {(isInputFocused || newComment.trim()) && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                <span className="text-[10px] opacity-70">
                  Tip: Use Ctrl+Enter to submit
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => {
                      setNewComment('');
                      setIsInputFocused(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newComment.trim() || createMutation.isPending}
                    className="h-7 px-3 text-xs gap-1.5 cursor-pointer font-medium"
                  >
                    {createMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    <span>Comment</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 pt-1">
        {isLoading ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 px-4 text-center border border-dashed border-border/70 rounded-xl bg-muted/10">
            <MessageSquare size={20} className="mx-auto text-muted-foreground/40 mb-1.5" />
            <p className="text-xs font-medium text-foreground">No comments yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Start the discussion or leave notes about this ticket.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const author = comment.user;
            const authorName = author?.name || 'User';
            const authorInitial = authorName.charAt(0).toUpperCase();
            const authorAvatar = author?.avatarUrl || author?.avatar_url;
            const isAuthor =
              currentUser?.id &&
              (currentUser.id === comment.user_id || currentUser.id === comment.userId);

            const isEditing = editingId === comment.id;
            const isDeleting = deletingId === comment.id;
            const isEdited = comment.updated_at !== comment.created_at;

            return (
              <div
                key={comment.id}
                className={cn(
                  'group flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 transition-colors text-xs',
                  isEditing && 'ring-1 ring-primary/40 bg-card'
                )}
              >
                {/* Author Avatar */}
                <Avatar size="sm" className="h-7 w-7 mt-0.5 shrink-0 ring-1 ring-border">
                  {authorAvatar ? (
                    <AvatarImage src={authorAvatar} alt={authorName} />
                  ) : (
                    <AvatarFallback className="text-[11px] font-medium bg-muted">
                      {authorInitial}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Comment Body */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Author metadata & time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {authorName}
                      </span>
                      {isAuthor && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[9px] font-mono text-primary border-primary/30 bg-primary/5"
                        >
                          You
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                      {isEdited && (
                        <span className="text-[10px] text-muted-foreground/70 italic">
                          (edited)
                        </span>
                      )}
                    </div>

                    {/* Actions Menu (for author or admins) */}
                    {isAuthor && !isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(comment)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Edit comment"
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(comment.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete comment"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Comment Content / Edit Form */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-border p-2 text-xs leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background"
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEdit(comment.id);
                          }
                          if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-6 px-2 text-[11px] cursor-pointer"
                        >
                          <X size={11} className="mr-1" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!editingContent.trim() || updateMutation.isPending}
                          onClick={() => handleSaveEdit(comment.id)}
                          className="h-6 px-2.5 text-[11px] gap-1 cursor-pointer font-medium"
                        >
                          {updateMutation.isPending ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Check size={11} />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
                      <span className="text-[11px] text-destructive font-medium">
                        Delete this comment permanently?
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                          className="h-6 px-2 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-6 px-2.5 text-[11px] cursor-pointer"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            'Delete'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-foreground leading-relaxed whitespace-pre-wrap break-words text-xs pt-0.5">
                      {comment.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
