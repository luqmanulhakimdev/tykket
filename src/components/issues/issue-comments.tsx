'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Reply,
  CornerDownRight,
  Pencil,
  Trash2,
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
import { CommentRichEditor } from './comment-rich-editor';

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

  // New root comment state
  const [newCommentContent, setNewCommentContent] = useState('');

  // Replying state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Deleting confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Calculate total count (root comments + replies)
  const totalCommentsCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  // Submit root comment
  const handleCreateRootComment = async () => {
    const content = newCommentContent.trim();
    if (!content || createMutation.isPending) return;

    try {
      await createMutation.mutateAsync({ content });
      setNewCommentContent('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  // Submit reply comment
  const handleCreateReply = async (parentCommentId: string) => {
    const content = replyContent.trim();
    if (!content || createMutation.isPending) return;

    try {
      await createMutation.mutateAsync({
        content,
        parentId: parentCommentId,
      });
      setReplyingToId(null);
      setReplyContent('');
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  // Start reply
  const handleStartReply = (commentId: string) => {
    setReplyingToId(commentId);
    setReplyContent('');
    setEditingId(null);
    setDeletingId(null);
  };

  // Start edit
  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditingContent(comment.content);
    setReplyingToId(null);
    setDeletingId(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  // Save edit
  const handleSaveEdit = async (commentId: string) => {
    const content = editingContent.trim();
    if (!content || updateMutation.isPending) return;

    try {
      await updateMutation.mutateAsync({ commentId, content });
      setEditingId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync(commentId);
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const currentUserName = currentUser?.name || 'You';
  const currentUserInitial = currentUserName.charAt(0).toUpperCase();

  // Helper to render a single comment bubble (used for both root comments and replies)
  const renderCommentBubble = (comment: Comment, isReply = false, parentAuthorName?: string) => {
    const author = comment.user;
    const authorName = author?.name || 'User';
    const authorInitial = authorName.charAt(0).toUpperCase();
    const authorAvatar = author?.avatarUrl || author?.avatar_url;
    const isAuthor =
      currentUser?.id &&
      (currentUser.id === comment.user_id || currentUser.id === comment.userId);

    const isEditing = editingId === comment.id;
    const isDeleting = deletingId === comment.id;
    const isReplying = replyingToId === comment.id;
    const isEdited = comment.updated_at !== comment.created_at;

    return (
      <div
        key={comment.id}
        className={cn(
          'group flex items-start gap-3 p-3.5 rounded-xl border transition-all text-xs',
          isReply
            ? 'bg-card/40 border-border/50 hover:bg-card/70'
            : 'bg-card/70 border-border/70 hover:bg-card/90 shadow-2xs',
          isEditing && 'ring-1 ring-primary/40 bg-card border-primary/40'
        )}
      >
        {/* Author Avatar */}
        <Avatar size="sm" className={cn('shrink-0 ring-1 ring-border', isReply ? 'h-6 w-6 mt-0.5' : 'h-7 w-7 mt-0.5')}>
          {authorAvatar ? (
            <AvatarImage src={authorAvatar} alt={authorName} />
          ) : (
            <AvatarFallback className="text-[10px] font-medium bg-muted">
              {authorInitial}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Comment Content Body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Metadata Header */}
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
              {isReply && parentAuthorName && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 font-normal">
                  <CornerDownRight size={10} className="text-muted-foreground/70" />
                  replying to <strong className="font-medium text-foreground/80">{parentAuthorName}</strong>
                </span>
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

            {/* Actions (Reply, Edit, Delete) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartReply(comment.id)}
                  className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                  title="Reply to comment"
                >
                  <Reply size={12} />
                  <span className="hidden sm:inline">Reply</span>
                </Button>
              )}
              {isAuthor && !isEditing && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Comment Rich Content or Editor */}
          {isEditing ? (
            <div className="pt-1">
              <CommentRichEditor
                value={editingContent}
                onChange={setEditingContent}
                onSubmit={() => handleSaveEdit(comment.id)}
                onCancel={handleCancelEdit}
                submitLabel="Save Changes"
                isSubmitting={updateMutation.isPending}
                placeholder="Edit your comment..."
                autoFocus
                minHeight={110}
              />
            </div>
          ) : isDeleting ? (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
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
                  className="h-6 px-2.5 text-[11px] cursor-pointer font-medium"
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
            <div
              className="text-foreground leading-relaxed text-xs pt-0.5 break-words tykket-rendered-comment prose dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline [&_img]:rounded-md [&_img]:max-w-full [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border/60 [&_td]:p-1.5 [&_th]:border [&_th]:border-border/60 [&_th]:p-1.5 [&_th]:bg-muted/40 [&_pre]:bg-muted/40 [&_pre]:p-2 [&_pre]:rounded [&_code]:text-[11px]"
              dangerouslySetInnerHTML={{ __html: comment.content }}
            />
          )}

          {/* Quick Reply Link at bottom if not already replying */}
          {!isEditing && !isReplying && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleStartReply(comment.id)}
                className="text-[11px] text-muted-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
              >
                <Reply size={11} />
                <span>Reply</span>
              </button>
            </div>
          )}

          {/* Nested Inline Reply Box */}
          {isReplying && (
            <div className="pt-2 pl-2 border-l-2 border-primary/40 mt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <CornerDownRight size={12} className="text-primary" />
                <span>Replying to <strong className="text-foreground">{authorName}</strong></span>
              </div>
              <CommentRichEditor
                value={replyContent}
                onChange={setReplyContent}
                onSubmit={() => handleCreateReply(comment.id)}
                onCancel={() => {
                  setReplyingToId(null);
                  setReplyContent('');
                }}
                submitLabel="Send Reply"
                isSubmitting={createMutation.isPending}
                placeholder={`Reply to ${authorName}...`}
                autoFocus
                minHeight={110}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4 pt-4 border-t border-border/70', className)}>
      {/* Discussion Header */}
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
            {totalCommentsCount}
          </Badge>
        </div>
      </div>

      {/* New Root Comment Form with TinyMCE */}
      <div className="flex items-start gap-3">
        <Avatar size="sm" className="h-7 w-7 mt-1 shrink-0 ring-1 ring-border">
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

        <div className="flex-1">
          <CommentRichEditor
            value={newCommentContent}
            onChange={setNewCommentContent}
            onSubmit={handleCreateRootComment}
            submitLabel="Post Comment"
            isSubmitting={createMutation.isPending}
            placeholder="Share feedback, updates, code snippets or upload files/images..."
            minHeight={130}
          />
        </div>
      </div>

      {/* Comments List & Threads */}
      <div className="space-y-4 pt-2">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-7 px-4 text-center border border-dashed border-border/70 rounded-xl bg-muted/10">
            <MessageSquare size={22} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-foreground">No comments yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Be the first to start the discussion or leave notes on this ticket.
            </p>
          </div>
        ) : (
          comments.map((rootComment) => {
            const replies = rootComment.replies || [];
            const rootAuthorName = rootComment.user?.name || 'User';

            return (
              <div key={rootComment.id} className="space-y-2">
                {/* Root Comment Item */}
                {renderCommentBubble(rootComment, false)}

                {/* Threaded Replies under Root Comment */}
                {replies.length > 0 && (
                  <div className="pl-6 md:pl-8 ml-3.5 border-l-2 border-border/60 space-y-2.5 pt-1">
                    {replies.map((reply) => {
                      // Find which comment in this thread this reply was replying to
                      let targetAuthorName = rootAuthorName;
                      if (reply.parent_id && reply.parent_id !== rootComment.id) {
                        const directParent = replies.find((r) => r.id === reply.parent_id);
                        if (directParent?.user?.name) {
                          targetAuthorName = directParent.user.name;
                        }
                      }
                      return renderCommentBubble(reply, true, targetAuthorName);
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
