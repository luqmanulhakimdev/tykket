import React from 'react';
import { IssueType } from '@/types/issue';
import { Zap, BookmarkCheck, CheckSquare, CornerDownRight, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssueTypeIconProps {
  type: IssueType;
  className?: string;
  size?: number;
}

export function IssueTypeIcon({ type, className, size = 16 }: IssueTypeIconProps) {
  switch (type) {
    case 'EPIC':
      return <Zap size={size} className={cn('text-purple-500 fill-purple-500/20 shrink-0', className)} />;
    case 'STORY':
      return <BookmarkCheck size={size} className={cn('text-emerald-500 fill-emerald-500/20 shrink-0', className)} />;
    case 'TASK':
      return <CheckSquare size={size} className={cn('text-blue-500 shrink-0', className)} />;
    case 'SUBTASK':
      return <CornerDownRight size={size} className={cn('text-teal-500 shrink-0', className)} />;
    case 'BUG':
      return <Bug size={size} className={cn('text-rose-500 fill-rose-500/20 shrink-0', className)} />;
    default:
      return <CheckSquare size={size} className={cn('text-slate-400 shrink-0', className)} />;
  }
}

export const issueTypeOptions: { value: IssueType; label: string }[] = [
  { value: 'EPIC', label: 'Epic' },
  { value: 'STORY', label: 'Story' },
  { value: 'TASK', label: 'Task' },
  { value: 'SUBTASK', label: 'Subtask' },
  { value: 'BUG', label: 'Bug' },
];

