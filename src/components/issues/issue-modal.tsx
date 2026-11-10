'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Issue, IssuePriority, IssueStatus, IssueType, User } from '@/types/issue';
import { IssueTypeIcon, issueTypeOptions } from './issue-type-icon';
import { IssuePriorityIcon, issuePriorityOptions } from './issue-priority-icon';
import { IssueDescriptionEditor } from './issue-description-editor';
import {
  useIssues,
  useCreateIssueMutation,
  useUpdateIssueMutation,
  useDeleteIssueMutation,
  useProjectMembers,
  ISSUES_QUERY_KEY,
} from '@/hooks/use-issues';
import { issuesApi } from '@/lib/api';
import {
  X,
  Plus,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Trash2,
  Layers,
  Search,
  ChevronDown,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useIssueModal } from '@/context/issue-modal-context';

const issueStatusOptions: { value: IssueStatus; label: string; dotColor: string }[] = [
  { value: 'TODO', label: 'To Do', dotColor: 'bg-slate-400' },
  { value: 'IN_PROGRESS', label: 'In Progress', dotColor: 'bg-blue-500' },
  { value: 'IN_REVIEW', label: 'In Review', dotColor: 'bg-amber-500' },
  { value: 'DONE', label: 'Done', dotColor: 'bg-emerald-500' },
];

const statusColorMap: Record<IssueStatus, string> = {
  BACKLOG: 'bg-slate-400',
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-amber-500',
  DONE: 'bg-emerald-500',
};

const statusLabelMap: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

interface IssueModalFormProps {
  issueToEdit?: Issue | null;
  defaultStatus?: IssueStatus;
  defaultType?: IssueType;
  defaultParentId?: string;
  closeModal: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

function IssueModalForm({
  issueToEdit,
  defaultStatus,
  defaultType,
  defaultParentId,
  closeModal,
  isFullScreen,
  onToggleFullScreen,
}: IssueModalFormProps) {
  const queryClient = useQueryClient();
  const projectKey = 'TYK';

  // Load issues and members from live Go backend
  const { data: issues = [] } = useIssues(projectKey);
  const { data: projectMembers = [] } = useProjectMembers(projectKey);

  const availableUsers: User[] = useMemo(() => {
    if (projectMembers.length > 0) {
      return projectMembers
        .map((m) => m.user)
        .filter((u): u is User => Boolean(u));
    }
    return [];
  }, [projectMembers]);

  // Local form state
  const [title, setTitle] = useState(issueToEdit ? issueToEdit.title : '');
  const [description, setDescription] = useState(
    issueToEdit ? issueToEdit.description || '' : ''
  );
  const [type, setType] = useState<IssueType>(
    issueToEdit ? issueToEdit.type : defaultType || 'TASK'
  );
  const [status, setStatus] = useState<IssueStatus>(
    issueToEdit ? issueToEdit.status : defaultStatus || 'TODO'
  );
  const [priority, setPriority] = useState<IssuePriority>(
    issueToEdit ? issueToEdit.priority : 'MEDIUM'
  );
  const [assigneeId, setAssigneeId] = useState<string>(
    issueToEdit?.assignee?.id || issueToEdit?.assignee_id || ''
  );
  const [parentId, setParentId] = useState<string>(
    issueToEdit
      ? issueToEdit.parentId || issueToEdit.parent_id || ''
      : defaultParentId || ''
  );
  const [storyPoints, setStoryPoints] = useState<number | ''>(
    issueToEdit?.storyPoints ?? issueToEdit?.story_points ?? ''
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Search states for dropdown pickers
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Available parent issues (Epics, Stories, Tasks - excluding current issue and subtasks)
  const availableParents = useMemo(() => {
    return issues.filter(
      (iss) =>
        iss.id !== issueToEdit?.id &&
        iss.type !== 'SUBTASK' &&
        iss.parentId !== issueToEdit?.id &&
        iss.parent_id !== issueToEdit?.id
    );
  }, [issues, issueToEdit]);

  // Subtasks belonging to current issue
  const subtasks = useMemo(() => {
    if (!issueToEdit?.id) return [];
    return issues.filter(
      (iss) =>
        (iss.parentId === issueToEdit.id || iss.parent_id === issueToEdit.id) &&
        iss.type === 'SUBTASK'
    );
  }, [issues, issueToEdit]);

  const selectedAssignee = useMemo(
    () =>
      availableUsers.find((u) => u.id === assigneeId) || issueToEdit?.assignee,
    [availableUsers, assigneeId, issueToEdit]
  );

  const selectedParent = useMemo(
    () => issues.find((iss) => iss.id === parentId),
    [issues, parentId]
  );

  // Mutations
  const createMutation = useCreateIssueMutation(projectKey);
  const updateMutation = useUpdateIssueMutation(projectKey);
  const deleteMutation = useDeleteIssueMutation(projectKey);

  // Save / Update Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (issueToEdit) {
      await updateMutation.mutateAsync({
        id: issueToEdit.id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          status,
          priority,
          assigneeId: assigneeId || undefined,
          parentId: parentId || undefined,
          storyPoints: storyPoints !== '' ? Number(storyPoints) : undefined,
        },
      });
    } else {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        priority,
        assigneeId: assigneeId || undefined,
        parentId: parentId || undefined,
        storyPoints: storyPoints !== '' ? Number(storyPoints) : undefined,
      });
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!issueToEdit?.id) return;
    if (confirm(`Move issue ${issueToEdit.key} to Trash Bin?`)) {
      await deleteMutation.mutateAsync(issueToEdit.id);
      closeModal();
    }
  };

  const handleCopyKey = () => {
    if (!issueToEdit?.key) return;
    navigator.clipboard.writeText(issueToEdit.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !issueToEdit?.id) return;
    await createMutation.mutateAsync({
      title: newSubtaskTitle.trim(),
      type: 'SUBTASK',
      priority: 'MEDIUM',
      status: 'TODO',
      parentId: issueToEdit.id,
    });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = async (subtask: Issue) => {
    const nextStatus: IssueStatus = subtask.status === 'DONE' ? 'TODO' : 'DONE';
    await issuesApi.moveIssue(projectKey, subtask.id, {
      status: nextStatus,
      position: subtask.position || 1000.0,
    });
    queryClient.invalidateQueries({ queryKey: [ISSUES_QUERY_KEY, projectKey] });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <form
      onSubmit={handleSave}
      className={cn(
        "flex flex-col w-full h-full overflow-hidden",
        isFullScreen ? "h-screen max-h-screen" : "max-h-[88vh]"
      )}
    >
      {/* Modal Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-border/80 shrink-0 bg-muted/20 transition-all",
          isFullScreen ? "px-8 py-4" : "px-6 py-3.5"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Beautified Issue Type Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className="inline-flex items-center gap-2 bg-background border border-border/80 hover:border-primary/50 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all hover:bg-muted/40 outline-none cursor-pointer group"
            >
              <IssueTypeIcon type={type} size={15} />
              <span>{issueTypeOptions.find((t) => t.value === type)?.label}</span>
              <ChevronDown size={13} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 p-1 bg-popover/95 backdrop-blur-md shadow-xl border-border">
              {issueTypeOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className="flex items-center justify-between text-xs py-2 px-2.5 rounded-md cursor-pointer hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <IssueTypeIcon type={opt.value} size={15} />
                    <span className={cn('font-medium', type === opt.value && 'font-semibold text-foreground')}>
                      {opt.label}
                    </span>
                  </div>
                  {type === opt.value && <Check size={14} className="text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Issue Key Badge */}
          {issueToEdit?.key && (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 border-border">
                {issueToEdit.key}
              </Badge>
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                title="Copy issue key"
              >
                {copiedKey ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
          )}

          {/* Parent breadcrumb pill if attached to parent */}
          {selectedParent && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
              <Layers size={12} />
              <span className="font-mono">{selectedParent.key}</span>
              <span className="truncate max-w-[120px]">{selectedParent.title}</span>
            </div>
          )}

          {isFullScreen && (
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Full Screen
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {issueToEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 cursor-pointer"
              title="Delete issue (move to trash)"
            >
              <Trash2 size={15} />
            </Button>
          )}

          {/* Toggle Full Screen / Popup mode */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleFullScreen}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title={isFullScreen ? "Switch to Popup Mode" : "Switch to Full Screen Mode"}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </Button>

          {/* Close Modal */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeModal}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          "overflow-y-auto flex-1 min-h-0",
          isFullScreen
            ? "grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border"
            : "grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border"
        )}
      >
        {/* Left Column: Title, Description, Checklist */}
        <div
          className={cn(
            isFullScreen
              ? "lg:col-span-3 p-8 lg:p-12 space-y-8 max-w-5xl w-full"
              : "md:col-span-2 p-6 space-y-6"
          )}
        >
          {/* Big Auto-resizing Title */}
          <div className="space-y-1">
            <textarea
              rows={2}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className={cn(
                "w-full resize-none bg-transparent font-bold placeholder:text-muted-foreground/60 border-0 focus:outline-none focus:ring-0 p-0 leading-snug",
                isFullScreen ? "text-2xl lg:text-3xl" : "text-xl"
              )}
            />
          </div>

          {/* Description Rich Text Editor */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <IssueDescriptionEditor
              value={description}
              onChange={setDescription}
              isFullScreen={isFullScreen}
              disabled={isSaving}
            />
          </div>

          {/* Subtasks / Checklist Section (Only for non-subtask issues) */}
          {type !== 'SUBTASK' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-primary" />
                  Subtasks & Checklist
                  {subtasks.length > 0 && (
                    <span className="text-[11px] font-normal text-muted-foreground ml-1">
                      ({subtasks.filter((s) => s.status === 'DONE').length}/{subtasks.length})
                    </span>
                  )}
                </label>
              </div>

              {/* Subtask list */}
              {subtasks.length > 0 && (
                <div className="space-y-1.5 border border-border/60 rounded-lg p-2 bg-muted/10">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors group text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        {st.status === 'DONE' ? (
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Circle size={16} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                        )}
                        <span
                          className={cn(
                            'truncate',
                            st.status === 'DONE' && 'line-through text-muted-foreground'
                          )}
                        >
                          {st.title}
                        </span>
                      </button>
                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {st.key}
                        </span>
                        <IssuePriorityIcon priority={st.priority} size={13} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add subtask input */}
              {issueToEdit ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new child subtask..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask(e);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim() || createMutation.isPending}
                    className="h-8 text-xs shrink-0 cursor-pointer"
                  >
                    <Plus size={13} className="mr-1" />
                    Add
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Save this issue first to attach child subtasks.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Properties Sidebar */}
        <div
          className={cn(
            "bg-muted/10 space-y-5",
            isFullScreen ? "lg:col-span-1 p-8 space-y-6 min-w-[280px]" : "md:col-span-1 p-6"
          )}
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Issue Properties
          </p>

          {/* Beautified Status Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Status
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="w-full flex items-center justify-between bg-background border border-border/80 hover:border-primary/50 px-3 py-2 rounded-lg text-xs font-medium shadow-2xs transition-all hover:bg-muted/40 outline-none cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', statusColorMap[status] || 'bg-slate-400')} />
                  <span className="font-semibold text-foreground truncate">
                    {statusLabelMap[status] || status}
                  </span>
                </div>
                <ChevronDown size={13} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 p-1 bg-popover/95 backdrop-blur-md shadow-xl border-border">
                {issueStatusOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-md cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', opt.dotColor)} />
                      <span className={cn('font-medium', status === opt.value && 'font-semibold text-foreground')}>
                        {opt.label}
                      </span>
                    </div>
                    {status === opt.value && <Check size={14} className="text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Beautified Priority Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Priority
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="w-full flex items-center justify-between bg-background border border-border/80 hover:border-primary/50 px-3 py-2 rounded-lg text-xs font-medium shadow-2xs transition-all hover:bg-muted/40 outline-none cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <IssuePriorityIcon priority={priority} size={15} />
                  <span className="font-semibold text-foreground truncate">
                    {issuePriorityOptions.find((p) => p.value === priority)?.label || priority}
                  </span>
                </div>
                <ChevronDown size={13} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 p-1 bg-popover/95 backdrop-blur-md shadow-xl border-border">
                {issuePriorityOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setPriority(opt.value)}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-md cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <IssuePriorityIcon priority={opt.value} size={15} />
                      <span className={cn('font-medium', priority === opt.value && 'font-semibold text-foreground')}>
                        {opt.label}
                      </span>
                    </div>
                    {priority === opt.value && <Check size={14} className="text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Assignee Selector with Search */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-muted-foreground">
              Assignee
            </label>
            <button
              type="button"
              onClick={() => setShowAssigneePicker(!showAssigneePicker)}
              className="w-full flex items-center justify-between bg-background border border-border rounded-md px-3 py-1.5 text-xs font-medium hover:border-primary/50 transition-colors text-left cursor-pointer"
            >
              {selectedAssignee ? (
                <div className="flex items-center gap-2 truncate">
                  <Avatar size="sm" className="h-5 w-5">
                    {selectedAssignee.avatarUrl ? (
                      <AvatarImage src={selectedAssignee.avatarUrl} alt={selectedAssignee.name} />
                    ) : (
                      <AvatarFallback className="text-[9px]">{selectedAssignee.name[0]}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="truncate">{selectedAssignee.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
            </button>

            {showAssigneePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg p-2 space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    placeholder="Search member..."
                    className="h-7 text-xs pl-7"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAssigneeId('');
                      setShowAssigneePicker(false);
                    }}
                    className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-xs text-left cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center text-[10px] text-muted-foreground">
                      -
                    </div>
                    <span className="text-muted-foreground">Unassigned</span>
                  </button>
                  {availableUsers
                    .filter((u) => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                    .map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setAssigneeId(user.id);
                          setShowAssigneePicker(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-xs text-left transition-colors cursor-pointer',
                          assigneeId === user.id && 'bg-muted font-medium'
                        )}
                      >
                        <Avatar size="sm" className="h-5 w-5">
                          {user.avatarUrl ? (
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                          ) : (
                            <AvatarFallback className="text-[9px]">{user.name[0]}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate leading-none">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Parent Issue Selector */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-muted-foreground">
              Parent Issue (Epic / Story)
            </label>
            <button
              type="button"
              onClick={() => setShowParentPicker(!showParentPicker)}
              className="w-full flex items-center justify-between bg-background border border-border rounded-md px-3 py-1.5 text-xs font-medium hover:border-primary/50 transition-colors text-left cursor-pointer"
            >
              {selectedParent ? (
                <div className="flex items-center gap-1.5 truncate">
                  <IssueTypeIcon type={selectedParent.type} size={13} />
                  <span className="font-mono text-[11px]">{selectedParent.key}</span>
                  <span className="truncate text-muted-foreground">{selectedParent.title}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
            </button>

            {showParentPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg p-2 space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    placeholder="Search parent issue..."
                    className="h-7 text-xs pl-7"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setParentId('');
                      setShowParentPicker(false);
                    }}
                    className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-xs text-left cursor-pointer"
                  >
                    <span className="text-muted-foreground">No Parent</span>
                  </button>
                  {availableParents
                    .filter(
                      (p) =>
                        p.title.toLowerCase().includes(parentSearch.toLowerCase()) ||
                        p.key.toLowerCase().includes(parentSearch.toLowerCase())
                    )
                    .map((parent) => (
                      <button
                        key={parent.id}
                        type="button"
                        onClick={() => {
                          setParentId(parent.id);
                          setShowParentPicker(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-xs text-left transition-colors cursor-pointer',
                          parentId === parent.id && 'bg-muted font-medium'
                        )}
                      >
                        <IssueTypeIcon type={parent.type} size={13} />
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          {parent.key}
                        </span>
                        <span className="truncate flex-1">{parent.title}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Story Points */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Story Points
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                max="100"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Pts"
                className="h-8 w-16 text-xs text-center font-mono"
              />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5, 8].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setStoryPoints(pts)}
                    className={cn(
                      "h-7 w-7 rounded-md border text-xs font-mono transition-colors cursor-pointer",
                      storyPoints === pts
                        ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                        : "border-border/80 hover:border-primary/50 bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timestamps if editing */}
          {issueToEdit && (
            <div className="pt-4 border-t border-border/60 space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{new Date(issueToEdit.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{new Date(issueToEdit.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div
        className={cn(
          "flex items-center justify-end gap-2 border-t border-border/80 shrink-0 bg-muted/20 transition-all",
          isFullScreen ? "px-8 py-4" : "px-6 py-3"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={closeModal}
          className="text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || isSaving}
          className="text-xs cursor-pointer"
        >
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin" />
              Saving...
            </span>
          ) : issueToEdit ? (
            'Save Changes'
          ) : (
            'Create Issue'
          )}
        </Button>
      </div>
    </form>
  );
}

const subscribeToFullScreen = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('tykket-fullscreen-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('tykket-fullscreen-change', callback);
  };
};

const getStoredFullScreen = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('tykket_issue_modal_fullscreen') === 'true';
  } catch {
    return false;
  }
};

export function IssueModal() {
  const { isOpen, closeModal, issueToEdit, defaultStatus, defaultType, defaultParentId } =
    useIssueModal();

  const isFullScreen = useSyncExternalStore(subscribeToFullScreen, getStoredFullScreen, () => false);

  const toggleFullScreen = () => {
    const next = !getStoredFullScreen();
    try {
      localStorage.setItem('tykket_issue_modal_fullscreen', String(next));
      window.dispatchEvent(new Event('tykket-fullscreen-change'));
    } catch {
      // Ignore
    }
  };

  // Reset form state cleanly when modal opens or issue target changes
  const formKey = `${isOpen}-${issueToEdit?.id || 'new'}-${defaultStatus || ''}-${defaultType || ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          isFullScreen
            ? "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none sm:max-w-none max-h-none rounded-none border-none p-0 gap-0 shadow-none z-50 bg-card overflow-hidden transition-all duration-200"
            : "w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden sm:rounded-xl border-border bg-card shadow-2xl transition-all duration-200"
        )}
      >
        <DialogTitle className="sr-only">
          {issueToEdit ? `Edit Issue ${issueToEdit.key}` : 'Create New Issue'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Create or update issue ticket metadata, description, subtasks, and priority.
        </DialogDescription>

        <IssueModalForm
          key={formKey}
          issueToEdit={issueToEdit}
          defaultStatus={defaultStatus}
          defaultType={defaultType}
          defaultParentId={defaultParentId}
          closeModal={closeModal}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
        />
      </DialogContent>
    </Dialog>
  );
}
