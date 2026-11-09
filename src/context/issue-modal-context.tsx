'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Issue, IssueStatus, IssueType } from '@/types/issue';

interface OpenCreateOptions {
  status?: IssueStatus;
  parentId?: string;
  type?: IssueType;
}

interface IssueModalContextType {
  isOpen: boolean;
  issueToEdit: Issue | null;
  defaultStatus: IssueStatus;
  defaultParentId?: string;
  defaultType?: IssueType;
  openCreateModal: (options?: OpenCreateOptions) => void;
  openEditModal: (issue: Issue) => void;
  closeModal: () => void;
}

const IssueModalContext = createContext<IssueModalContextType | undefined>(undefined);

export function IssueModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [issueToEdit, setIssueToEdit] = useState<Issue | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<IssueStatus>('TODO');
  const [defaultParentId, setDefaultParentId] = useState<string | undefined>(undefined);
  const [defaultType, setDefaultType] = useState<IssueType | undefined>(undefined);

  const openCreateModal = useCallback((options?: OpenCreateOptions) => {
    setIssueToEdit(null);
    setDefaultStatus(options?.status ?? 'TODO');
    setDefaultParentId(options?.parentId);
    setDefaultType(options?.type ?? 'TASK');
    setIsOpen(true);
  }, []);

  const openEditModal = useCallback((issue: Issue) => {
    setIssueToEdit(issue);
    setDefaultStatus(issue.status);
    setDefaultParentId(issue.parentId || undefined);
    setDefaultType(issue.type);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIssueToEdit(null);
  }, []);

  return (
    <IssueModalContext.Provider
      value={{
        isOpen,
        issueToEdit,
        defaultStatus,
        defaultParentId,
        defaultType,
        openCreateModal,
        openEditModal,
        closeModal,
      }}
    >
      {children}
    </IssueModalContext.Provider>
  );
}

export function useIssueModal() {
  const context = useContext(IssueModalContext);
  if (!context) {
    throw new Error('useIssueModal must be used within an IssueModalProvider');
  }
  return context;
}

