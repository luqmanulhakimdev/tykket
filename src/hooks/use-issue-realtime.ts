'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Issue, IssueStatus } from '@/types/issue';
import { ISSUES_QUERY_KEY } from './use-issues';

export type RealtimeEventType =
  | 'issue.created'
  | 'issue.moved'
  | 'issue.updated'
  | 'issue.deleted';

export interface RealtimeMessage {
  type: RealtimeEventType;
  data: unknown;
  sender?: {
    id: string;
    name: string;
  };
  timestamp: string;
}

interface UseIssueRealtimeOptions {
  projectKey?: string;
  enabled?: boolean;
}

/**
 * Real-time SSE / WebSocket event listener hook for multi-user collaboration.
 * Automatically synchronizes React Query cache when team members move, update,
 * or create issues.
 */
export function useIssueRealtime({
  projectKey = 'TYK',
  enabled = true,
}: UseIssueRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const sseUrl = `${
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1'
    }/events?project=${projectKey}`;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setStatus('connected');
      };

      eventSource.onerror = () => {
        setStatus('disconnected');
      };

      // 1. Issue Created Event
      eventSource.addEventListener('issue.created', (event) => {
        try {
          const payload: Issue = JSON.parse(event.data);
          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY, projectKey], (old = []) => {
            if (old.some((i) => i.id === payload.id)) return old;
            return [...old, payload];
          });
          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY], (old = []) => {
            if (old.some((i) => i.id === payload.id)) return old;
            return [...old, payload];
          });
          toast.info(`New Issue: ${payload.key}`, {
            description: payload.title,
          });
        } catch (e) {
          console.error('Error handling issue.created event', e);
        }
      });

      // 2. Issue Moved Event
      eventSource.addEventListener('issue.moved', (event) => {
        try {
          const payload: {
            id: string;
            status: IssueStatus;
            position: number;
            actorName?: string;
          } = JSON.parse(event.data);

          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY, projectKey], (old = []) => {
            return old.map((iss) =>
              iss.id === payload.id
                ? {
                    ...iss,
                    status: payload.status,
                    position: payload.position,
                    updatedAt: new Date().toISOString(),
                  }
                : iss
            );
          });
          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY], (old = []) => {
            return old.map((iss) =>
              iss.id === payload.id
                ? {
                    ...iss,
                    status: payload.status,
                    position: payload.position,
                    updatedAt: new Date().toISOString(),
                  }
                : iss
            );
          });

          if (payload.actorName) {
            toast.info(`Ticket moved by ${payload.actorName}`, {
              description: `Moved to ${payload.status}`,
            });
          }
        } catch (e) {
          console.error('Error handling issue.moved event', e);
        }
      });

      // 3. Issue Updated Event
      eventSource.addEventListener('issue.updated', (event) => {
        try {
          const payload: Issue = JSON.parse(event.data);
          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY, projectKey], (old = []) => {
            return old.map((iss) => (iss.id === payload.id ? payload : iss));
          });
          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY], (old = []) => {
            return old.map((iss) => (iss.id === payload.id ? payload : iss));
          });
        } catch (e) {
          console.error('Error handling issue.updated event', e);
        }
      });

      // 4. Issue Deleted Event
      eventSource.addEventListener('issue.deleted', (event) => {
        try {
          const payload: { id: string } = JSON.parse(event.data);
          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY, projectKey], (old = []) => {
            return old.filter((iss) => iss.id !== payload.id);
          });
          queryClient.setQueryData<Issue[]>([ISSUES_QUERY_KEY], (old = []) => {
            return old.filter((iss) => iss.id !== payload.id);
          });
        } catch (e) {
          console.error('Error handling issue.deleted event', e);
        }
      });
    } catch {
      // Handled silently if EventSource constructor fails
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [projectKey, enabled, queryClient]);

  return { status };
}
