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
import { useCreateSprintMutation } from '@/hooks/use-issues';
import { Calendar, Loader2, Sparkles, Timer } from 'lucide-react';

interface CreateSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  nextSprintNumber?: number;
}

function toInputDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface CreateSprintFormProps {
  onClose: () => void;
  projectKey: string;
  nextSprintNumber: number;
}

function CreateSprintForm({
  onClose,
  projectKey,
  nextSprintNumber,
}: CreateSprintFormProps) {
  const createMutation = useCreateSprintMutation(projectKey);

  const [name, setName] = useState(`Sprint ${nextSprintNumber}`);
  const [duration, setDuration] = useState<'1' | '2' | '3' | '4' | 'custom'>('2');
  const [startDate, setStartDate] = useState(() => toInputDate(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 14);
    return toInputDate(end);
  });
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');

  const handleDurationChange = (dur: '1' | '2' | '3' | '4' | 'custom') => {
    setDuration(dur);
    if (dur !== 'custom') {
      const weeks = parseInt(dur, 10);
      const start = startDate ? new Date(startDate) : new Date();
      const end = new Date(start);
      end.setDate(start.getDate() + weeks * 7);

      setStartDate(toInputDate(start));
      setEndDate(toInputDate(end));
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (duration !== 'custom' && val) {
      const weeks = parseInt(duration, 10);
      const start = new Date(val);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(start.getDate() + weeks * 7);
        setEndDate(toInputDate(end));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Sprint name is required.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        goal: goal.trim() || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
      });
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
              Create Sprint
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Plan a new iteration for project {projectKey}.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Sprint Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Sprint Name *</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              e.g. Sprint {nextSprintNumber}
            </span>
          </label>
          <Input
            type="text"
            placeholder="e.g. Sprint 1"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            className="h-9 text-xs"
            autoFocus
          />
          {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
        </div>

        {/* Duration Presets */}
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
              onChange={(e) => handleStartDateChange(e.target.value)}
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
            <span>Sprint Goal (Optional)</span>
          </label>
          <Textarea
            placeholder="What do we want to accomplish this sprint?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="min-h-16 text-xs resize-none"
          />
        </div>

        <DialogFooter className="pt-2 gap-2 sm:gap-0">
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
            disabled={createMutation.isPending}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            {createMutation.isPending && (
              <Loader2 size={13} className="animate-spin" />
            )}
            <span>Create Sprint</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function CreateSprintDialog({
  open,
  onOpenChange,
  projectKey,
  nextSprintNumber = 1,
}: CreateSprintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CreateSprintForm
          onClose={() => onOpenChange(false)}
          projectKey={projectKey}
          nextSprintNumber={nextSprintNumber}
        />
      )}
    </Dialog>
  );
}
