'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useCreateProjectMutation } from '@/hooks/use-issues';
import { FolderPlus, Loader2, Sparkles } from 'lucide-react';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const router = useRouter();
  const createMutation = useCreateProjectMutation();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [keyError, setKeyError] = useState('');

  // Helper to generate a project key from project name
  const generateKeyFromName = (projectName: string): string => {
    const cleaned = projectName.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) {
      return words[0].slice(0, 4).toUpperCase();
    }
    // Take first letters of words, up to 4 chars
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isKeyManuallyEdited) {
      setKey(generateKeyFromName(newName));
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsKeyManuallyEdited(true);
    const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setKey(upper);

    if (upper.length > 0 && upper.length < 2) {
      setKeyError('Key must be at least 2 characters');
    } else {
      setKeyError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedKey = key.trim().toUpperCase();

    if (!trimmedName) return;
    if (trimmedKey.length < 2 || trimmedKey.length > 10) {
      setKeyError('Key must be 2-10 characters (uppercase alphanumeric)');
      return;
    }

    try {
      const newProject = await createMutation.mutateAsync({
        name: trimmedName,
        key: trimmedKey,
        description: description.trim() || undefined,
      });

      // Reset form
      setName('');
      setKey('');
      setDescription('');
      setIsKeyManuallyEdited(false);
      setKeyError('');
      onOpenChange(false);

      // Navigate to new project's kanban board
      router.push(`/projects/${newProject.key}/board`);
    } catch {
      // Error handled by mutation onError toast
    }
  };

  const isValid = name.trim().length >= 2 && key.trim().length >= 2 && !keyError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FolderPlus size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Create New Project</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up a new workspace for tracking issues, sprints, and tasks.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label htmlFor="projectName" className="text-xs font-semibold">
              Project Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="projectName"
              placeholder="e.g. Infrastructure Platform"
              value={name}
              onChange={handleNameChange}
              required
              autoFocus
              className="h-9 text-xs"
            />
          </div>

          {/* Project Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="projectKey" className="text-xs font-semibold">
                Project Key <span className="text-destructive">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground">
                Prefix for ticket keys (e.g. {key || 'INF'}-101)
              </span>
            </div>
            <div className="relative">
              <Input
                id="projectKey"
                placeholder="e.g. INF"
                value={key}
                onChange={handleKeyChange}
                maxLength={10}
                required
                className="h-9 text-xs font-mono uppercase tracking-wider pr-16"
              />
              {!isKeyManuallyEdited && key && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-primary flex items-center gap-1 font-sans">
                  <Sparkles size={11} /> Auto
                </span>
              )}
            </div>
            {keyError && <p className="text-[11px] text-destructive">{keyError}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="projectDesc" className="text-xs font-semibold">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="projectDesc"
              placeholder="Short summary of this workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValid || createMutation.isPending}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {createMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FolderPlus size={13} />
              )}
              <span>Create Project</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
