'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { projectsApi } from '@/lib/api';
import { Project, ProjectMember } from '@/types/issue';
import {
  Users,
  Shield,
  Trash2,
  Check,
  UserPlus,
  Loader2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GeneralSettingsProps {
  project?: Project;
  projectKey: string;
  loading: boolean;
}

function GeneralSettingsForm({ project, projectKey, loading }: GeneralSettingsProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await projectsApi.update(projectKey, data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['project', projectKey], updated);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project settings saved successfully');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update project';
      toast.error('Update failed', { description: msg });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate({
      name: name.trim(),
      description: description.trim(),
    });
  };

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-base">General Information</CardTitle>
        <CardDescription className="text-xs">
          Workspace identification and descriptions saved directly in PostgreSQL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Project Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tykket Core Platform"
                disabled={loading}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Project Key
              </label>
              <Input
                value={project?.key || projectKey}
                readOnly
                className="text-xs h-9 font-mono bg-muted/40 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief project goal or architecture context..."
              disabled={loading}
              className="text-xs h-9"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Total issues created: <strong className="text-foreground">{project?.issue_counter ?? 0}</strong>
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending || loading}
              className="text-xs font-semibold cursor-pointer"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check size={14} />
                  Save Changes
                </span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const projectKey = (params?.projectKey as string) || 'TYK';
  const queryClient = useQueryClient();

  // Load project metadata
  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: ['project', projectKey],
    queryFn: async () => {
      return await projectsApi.get(projectKey);
    },
    staleTime: 30000,
  });

  // Load project members
  const { data: members = [], isLoading: loadingMembers } = useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectKey],
    queryFn: async () => {
      return await projectsApi.getMembers(projectKey);
    },
    staleTime: 30000,
  });

  // Add Member State
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      return await projectsApi.addMember(projectKey, {
        email: newMemberEmail.trim(),
        role_name: newMemberRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectKey] });
      setNewMemberEmail('');
      setIsAddingMember(false);
      toast.success('Team member added successfully');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to add member';
      toast.error('Could not add member', { description: msg });
    },
  });

  const getRoleBadgeVariant = (roleName?: string) => {
    switch (roleName?.toUpperCase()) {
      case 'OWNER':
        return 'default';
      case 'ADMIN':
        return 'secondary';
      case 'MEMBER':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="w-full md:w-[65%] mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Project Settings
            </h1>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              {projectKey}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage workspace identity, team membership, and data retention powered by live Go backend
          </p>
        </div>

      <Separator />

      {/* General Information Card */}
      <GeneralSettingsForm
        key={project?.id || 'loading'}
        project={project}
        projectKey={projectKey}
        loading={loadingProject}
      />

      {/* Team Members Card */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} className="text-primary" />
              Team Members & Roles
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Collaborators with workspace access governed by RBAC permissions.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingMember(!isAddingMember)}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Add Member</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add member inline form */}
          {isAddingMember && (
            <div className="p-3 border border-border/80 rounded-lg bg-muted/30 space-y-3">
              <p className="text-xs font-semibold">Invite New Member</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="colleague@tykket.dev"
                  className="sm:col-span-2 text-xs h-8"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    className="flex items-center justify-between bg-background border border-border/80 hover:border-primary/50 rounded-md px-2.5 text-xs h-8 cursor-pointer outline-none transition-colors"
                  >
                    <span className="font-semibold">{newMemberRole}</span>
                    <ChevronDown size={12} className="text-muted-foreground ml-1" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 p-1 bg-popover/95 backdrop-blur-md shadow-xl border-border">
                    {(['ADMIN', 'MEMBER', 'VIEWER'] as const).map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => setNewMemberRole(role)}
                        className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer hover:bg-muted rounded-md transition-colors"
                      >
                        <span className={cn('font-medium', newMemberRole === role && 'font-semibold text-foreground')}>
                          {role}
                        </span>
                        {newMemberRole === role && <Check size={12} className="text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingMember(false)}
                  className="text-xs h-7 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newMemberEmail.trim() || addMemberMutation.isPending}
                  onClick={() => addMemberMutation.mutate()}
                  className="text-xs h-7 cursor-pointer"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}

          {/* Members list */}
          {loadingMembers ? (
            <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              Loading members...
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="sm" className="h-8 w-8 ring-1 ring-border">
                      <AvatarImage src={m.user?.avatarUrl} alt={m.user?.name} />
                      <AvatarFallback className="text-xs font-semibold">
                        {m.user?.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate leading-tight">
                        {m.user?.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={getRoleBadgeVariant(m.role?.name)} className="font-mono text-[10px]">
                      {m.role?.name || 'MEMBER'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Stages Card */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            Kanban Lifecycle Columns
          </CardTitle>
          <CardDescription className="text-xs">
            Stages mapped to backend <code className="font-mono text-[11px] bg-muted px-1 rounded">IssueStatus</code> enum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
              <p className="font-bold text-foreground">To Do</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">TODO</p>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-blue-500/10 border-blue-500/30">
              <p className="font-bold text-blue-500">In Progress</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">IN_PROGRESS</p>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-amber-500/10 border-amber-500/30">
              <p className="font-bold text-amber-500">In Review</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">IN_REVIEW</p>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-emerald-500/10 border-emerald-500/30">
              <p className="font-bold text-emerald-500">Done</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">DONE</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention & Soft Delete Card */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trash2 size={16} className="text-destructive" />
              Data Retention & Soft Delete Strategy
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              deleted_at
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Soft-deleted tickets remain recoverable in PostgreSQL. Subtasks cascade automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            Issues removed from board or backlog are preserved with timestamps. Use the Trash Bin to restore tickets or permanently purge them.
          </p>
          <Link href={`/projects/${projectKey}/trash`}>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 cursor-pointer shrink-0"
            >
              <ExternalLink size={13} />
              Open Trash Bin
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  </div>
  );
}
