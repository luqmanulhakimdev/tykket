'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  issuesApi,
  projectsApi,
  sprintsApi,
  commentsApi,
  IssueFilterParams,
} from '@/lib/api';
import {
  CreateIssueInput,
  Issue,
  IssueStatus,
  ProjectMember,
  Sprint,
  UpdateIssueInput,
  Comment,
} from '@/types/issue';

export const ISSUES_QUERY_KEY = 'issues';
export const TRASH_QUERY_KEY = 'issues-trash';
export const MEMBERS_QUERY_KEY = 'project-members';
export const SPRINTS_QUERY_KEY = 'project-sprints';
export const COMMENTS_QUERY_KEY = 'issue-comments';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const response = obj.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (typeof obj.message === 'string') return obj.message;
  }
  return fallback;
}

const getStoredTrash = (key: string): Issue[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(`tykket_trash_${key}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Ignore parse errors
    }
  }
  return [];
};

const setStoredTrash = (key: string, trash: Issue[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`tykket_trash_${key}`, JSON.stringify(trash));
  }
};

/**
 * Fetch issues from Go backend API (/api/v1/projects/:projectId/issues)
 */
export function useIssues(projectKey = 'TYK', filterParams?: IssueFilterParams) {
  return useQuery<Issue[]>({
    queryKey: [ISSUES_QUERY_KEY, projectKey, filterParams],
    queryFn: async () => {
      const issues = await issuesApi.getIssues(projectKey, filterParams);
      return issues;
    },
    staleTime: 5000,
  });
}

/**
 * Fetch project members for assignee selection
 */
export function useProjectMembers(projectKey = 'TYK') {
  return useQuery<ProjectMember[]>({
    queryKey: [MEMBERS_QUERY_KEY, projectKey],
    queryFn: async () => {
      return await projectsApi.getMembers(projectKey);
    },
    staleTime: 60000,
  });
}

/**
 * Fetch project sprints
 */
export function useSprints(projectKey = 'TYK') {
  return useQuery<Sprint[]>({
    queryKey: [SPRINTS_QUERY_KEY, projectKey],
    queryFn: async () => {
      return await sprintsApi.list(projectKey);
    },
    staleTime: 30000,
  });
}

/**
 * Soft-deleted issues
 */
export function useTrashIssues(projectKey = 'TYK') {
  return useQuery<Issue[]>({
    queryKey: [TRASH_QUERY_KEY, projectKey],
    queryFn: async () => {
      return getStoredTrash(projectKey);
    },
    initialData: () => getStoredTrash(projectKey),
  });
}

/**
 * Robust Drag-and-Drop Move Mutation with optimistic updates,
 * snapshot rollback on error, and background invalidation against live Go backend.
 */
export function useMoveIssueMutation(projectKey = 'TYK') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      position,
      sprintId,
    }: {
      id: string;
      status: IssueStatus;
      position: number;
      sprintId?: string;
    }) => {
      return await issuesApi.moveIssue(projectKey, id, {
        status,
        position,
        sprint_id: sprintId,
      });
    },

    onMutate: async ({ id, status, position }) => {
      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: [ISSUES_QUERY_KEY, projectKey] });

      const previousQueries = queryClient.getQueriesData<Issue[]>({
        queryKey: [ISSUES_QUERY_KEY, projectKey],
      });

      // Optimistically update all matching issue queries
      queryClient.setQueriesData<Issue[]>(
        { queryKey: [ISSUES_QUERY_KEY, projectKey] },
        (old = []) =>
          old.map((iss) =>
            iss.id === id
              ? {
                  ...iss,
                  status,
                  position,
                  updatedAt: new Date().toISOString(),
                }
              : iss
          )
      );

      return { previousQueries };
    },

    onError: (err: unknown, _variables, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }

      toast.error('Failed to move issue', {
        description: getErrorMessage(
          err,
          'Could not sync position with server. Reverting to previous column.'
        ),
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ISSUES_QUERY_KEY, projectKey] });
    },
  });
}

/**
 * Create issue mutation calling POST /api/v1/projects/:projectId/issues
 */
export function useCreateIssueMutation(projectKey = 'TYK') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateIssueInput) => {
      return await issuesApi.createIssue(projectKey, data);
    },
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: [ISSUES_QUERY_KEY, projectKey] });
      toast.success(`Issue ${newIssue.key} created`, {
        description: newIssue.title,
      });
    },
    onError: (err: unknown) => {
      toast.error('Failed to create issue', {
        description: getErrorMessage(err, 'Failed to create issue'),
      });
    },
  });
}

/**
 * Update issue mutation calling PUT /api/v1/projects/:projectId/issues/:issueId
 */
export function useUpdateIssueMutation(projectKey = 'TYK') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIssueInput }) => {
      return await issuesApi.updateIssue(projectKey, id, data);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [ISSUES_QUERY_KEY, projectKey] });
      toast.success(`Issue ${updated.key} updated`);
    },
    onError: (err: unknown) => {
      toast.error('Failed to update issue', {
        description: getErrorMessage(err, 'Failed to update issue'),
      });
    },
  });
}

/**
 * Delete issue mutation calling DELETE /api/v1/projects/:projectId/issues/:issueId
 */
export function useDeleteIssueMutation(projectKey = 'TYK') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await issuesApi.deleteIssue(projectKey, id);
      return id;
    },
    onSuccess: (deletedId) => {
      const allIssues =
        queryClient.getQueryData<Issue[]>([ISSUES_QUERY_KEY, projectKey]) || [];
      const deletedIssue = allIssues.find((i) => i.id === deletedId);

      // Invalidate active issues query
      queryClient.invalidateQueries({ queryKey: [ISSUES_QUERY_KEY, projectKey] });

      if (deletedIssue) {
        const trashItem: Issue = {
          ...deletedIssue,
          deletedAt: new Date().toISOString(),
          deletedBy: {
            id: 'current-user',
            name: 'Me',
          },
        };
        const currentTrash = getStoredTrash(projectKey);
        const nextTrash = [trashItem, ...currentTrash.filter((i) => i.id !== deletedId)];
        setStoredTrash(projectKey, nextTrash);

        queryClient.setQueryData<Issue[]>([TRASH_QUERY_KEY, projectKey], nextTrash);
        toast.info(`Moved ${deletedIssue.key} to Trash Bin`, {
          description: deletedIssue.title,
        });
      }
    },
    onError: (err: unknown) => {
      toast.error('Failed to delete issue', {
        description: getErrorMessage(err, 'Failed to delete issue'),
      });
    },
  });
}

/**
 * Restore issue mutation
 */
export function useRestoreIssueMutation(projectKey = 'TYK') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const trash = getStoredTrash(projectKey);
      const item = trash.find((i) => i.id === id);
      if (!item) throw new Error('Issue not found in Trash');
      return await issuesApi.restoreIssue(projectKey, item);
    },
    onSuccess: (restored, id) => {
      const trash = getStoredTrash(projectKey);
      const nextTrash = trash.filter((iss) => iss.id !== id);
      setStoredTrash(projectKey, nextTrash);
      queryClient.setQueryData<Issue[]>([TRASH_QUERY_KEY, projectKey], nextTrash);

      queryClient.invalidateQueries({ queryKey: [ISSUES_QUERY_KEY, projectKey] });

      toast.success(`Restored ${restored.key}`, {
        description: 'Issue restored to active board and backlog.',
      });
    },
    onError: (err: unknown) => {
      toast.error('Failed to restore issue', {
        description: getErrorMessage(err, 'Failed to restore issue'),
      });
    },
  });
}

/**
 * Permanent Delete mutation
 */
export function usePermanentDeleteMutation(projectKey = 'TYK') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await issuesApi.permanentDeleteIssue(projectKey, id);
      return id;
    },
    onSuccess: (id) => {
      const trash = getStoredTrash(projectKey);
      const nextTrash = trash.filter((iss) => iss.id !== id);
      setStoredTrash(projectKey, nextTrash);

      queryClient.setQueryData<Issue[]>([TRASH_QUERY_KEY, projectKey], nextTrash);
      toast.success('Issue permanently deleted');
    },
  });
}

/**
 * Fetch comments for an issue
 */
export function useComments(issueId?: string) {
  return useQuery<Comment[]>({
    queryKey: [COMMENTS_QUERY_KEY, issueId],
    queryFn: async () => {
      if (!issueId) return [];
      return await commentsApi.getComments(issueId);
    },
    enabled: Boolean(issueId),
    staleTime: 10000,
  });
}

/**
 * Create comment mutation
 */
export function useCreateCommentMutation(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      return await commentsApi.createComment(issueId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, issueId] });
      toast.success('Comment added');
    },
    onError: (err: unknown) => {
      toast.error('Failed to post comment', {
        description: getErrorMessage(err, 'Failed to post comment'),
      });
    },
  });
}

/**
 * Update comment mutation
 */
export function useUpdateCommentMutation(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      return await commentsApi.updateComment(commentId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, issueId] });
      toast.success('Comment updated');
    },
    onError: (err: unknown) => {
      toast.error('Failed to update comment', {
        description: getErrorMessage(err, 'Failed to update comment'),
      });
    },
  });
}

/**
 * Delete comment mutation
 */
export function useDeleteCommentMutation(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await commentsApi.deleteComment(commentId);
      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, issueId] });
      toast.success('Comment deleted');
    },
    onError: (err: unknown) => {
      toast.error('Failed to delete comment', {
        description: getErrorMessage(err, 'Failed to delete comment'),
      });
    },
  });
}
