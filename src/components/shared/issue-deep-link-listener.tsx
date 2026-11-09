'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useIssues } from '@/hooks/use-issues';
import { useIssueModal } from '@/context/issue-modal-context';

export function IssueDeepLinkListener({ projectKey = 'TYK' }: { projectKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: issues = [] } = useIssues(projectKey);
  const { openEditModal, isOpen } = useIssueModal();

  const issueKeyFromUrl = searchParams?.get('issue');
  const openedRef = useRef<string | null>(null);

  // Open modal if URL has ?issue=KEY
  useEffect(() => {
    if (issueKeyFromUrl && issues.length > 0) {
      if (openedRef.current !== issueKeyFromUrl) {
        const found = issues.find(
          (i) => i.key.toUpperCase() === issueKeyFromUrl.toUpperCase()
        );
        if (found) {
          openedRef.current = issueKeyFromUrl;
          openEditModal(found);
        }
      }
    }
  }, [issueKeyFromUrl, issues, openEditModal]);

  // Clean URL when modal closes
  useEffect(() => {
    if (!isOpen && issueKeyFromUrl) {
      openedRef.current = null;
      const params = new URLSearchParams(searchParams?.toString());
      params.delete('issue');
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
    }
  }, [isOpen, issueKeyFromUrl, pathname, router, searchParams]);

  return null;
}

