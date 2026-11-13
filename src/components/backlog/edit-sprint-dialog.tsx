'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useUpdateSprintMutation,
  useDeleteSprintMutation,
} from '@/hooks/use-issues';
import { Sprint } from '@/types/issue';
import { Calendar, Loader2, Sparkles, Timer, Trash2 } from 'lucide-react';

interface EditSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  sprint: Sprint | null;
}

function toInputDate(dStr?: string): string {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

interface EditSprintFormProps {
  onClose: () => void;
  projectKey: string;
  sprint: Sprint;
}

function EditSprintForm({ onClose, projectKey, sprint }: EditSprintFormProps) {
  const updateMutation = useUpdateSprintMutation(projectKey);
  const deleteMutation = useDeleteSprintMutation(projectKey);

  const [name, setName] = useState(sprint.name);
  const [duration, setDuration] = useState<'1' | '2' | '3' | '4' | 'custom'>('custom');
  const [startDate, setStartDate] = useState(() => toInputDate(sprint.start_date));
  const [endDate, setEndDate] = useState(() => toInputDate(sprint.end_date));
  const [goal, setGoal] = useState(sprint.goal || '');
  const [error, setError] = useState('');

  const handleDurationChange = (dur: '1' | '2' | '3' | '4' | 'custom') => {
    setDuration(dur);
    if (dur !== 'custom') {
      const weeks = parseInt(dur, 10);
      const start = startDate ? new Date(startDate) : new Date();
      const end = new Date(start);
      end.setDate(start.getDate() + weeks * 7);

      const toInput = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      setStartDate(toInput(start));
      setEndDate(toInput(end));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Sprint name is required.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        sprintId: sprint.id,
        data: {
          name: name.trim(),
          goal: goal.trim() || undefined,
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
        },
      });
      onClose();
    } catch {
      // Handled in mutation onError
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${sprint.name}"? Issues assigned to this sprint will move back to the backlog.`
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(sprint.id);
      onClose();
    } catch {
      // Handled in mutation onError
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Timer size={18} />
          </div>
          <div>
            <DialogTitle className="text-base font-bold">
              Edit Sprint
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update iteration parameters for &ldquo;{sprint.name}&rdquo;.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Sprint Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Sprint Name *
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Sprint 1"
            className="h-9 text-xs"
            autoFocus
          />
          {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
        </div>

        {/* Duration Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Duration</label>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { id: '1', label: '1 wk' },
                { id: '2', label: '2 wks' },
                { id: '3', label: '3 wks' },
                { id: '4', label: '4 wks' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant={duration === preset.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDurationChange(preset.id)}
                className="h-8 text-xs font-medium"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Calendar size={12} className="text-muted-foreground" />
              <span>Start Date</span>
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDuration('custom');
              }}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Calendar size={12} className="text-muted-foreground" />
              <span>End Date</span>
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDuration('custom');
              }}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Sprint Goal */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Sparkles size={12} className="text-muted-foreground" />
            <span>Sprint Goal</span>
          </label>
          <Textarea
            placeholder="What is the objective of this sprint?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="min-h-16 text-xs resize-none"
          />
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
          {sprint.status !== 'COMPLETED' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              {updateMutation.isPending && (
                <Loader2 size={13} className="animate-spin" />
              )}
              <span>Save Changes</span>
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function EditSprintDialog({
  open,
  onOpenChange,
  projectKey,
  sprint,
}: EditSprintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && sprint && (
        <EditSprintForm
          onClose={() => onOpenChange(false)}
          projectKey={projectKey}
          sprint={sprint}
        />
      )}
    </Dialog>
  );
}

