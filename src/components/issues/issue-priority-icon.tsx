import React from 'react';
import { IssuePriority } from '@/types/issue';
import { ChevronsUp, ChevronUp, Equal, ChevronDown, ChevronsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssuePriorityIconProps {
  priority: IssuePriority;
  className?: string;
  size?: number;
}

export function IssuePriorityIcon({ priority, className, size = 16 }: IssuePriorityIconProps) {
  switch (priority) {
    case 'URGENT':
    case 'HIGHEST':
      return <ChevronsUp size={size} className={cn('text-red-500 shrink-0 font-bold', className)} />;
    case 'HIGH':
      return <ChevronUp size={size} className={cn('text-orange-500 shrink-0', className)} />;
    case 'MEDIUM':
      return <Equal size={size} className={cn('text-amber-500 shrink-0', className)} />;
    case 'LOW':
      return <ChevronDown size={size} className={cn('text-blue-500 shrink-0', className)} />;
    case 'LOWEST':
      return <ChevronsDown size={size} className={cn('text-slate-400 shrink-0', className)} />;
    default:
      return <Equal size={size} className={cn('text-slate-400 shrink-0', className)} />;
  }
}

export const issuePriorityOptions: { value: IssuePriority; label: string }[] = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];
