'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  Zap,
  Calendar,
  ArrowRight,
  Settings,
  ListTree,
  LayoutDashboard,
} from 'lucide-react';
import { useProjects, useProjectMembers, useSprints } from '@/hooks/use-issues';
import { Project } from '@/types/issue';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  const { data: members = [], isLoading: membersLoading } = useProjectMembers(project.id);
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(project.id);

  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'ACTIVE') || null;
  }, [sprints]);

  const plannedSprints = useMemo(() => {
    return sprints.filter((s) => s.status === 'PLANNED');
  }, [sprints]);

  const projectKey = project.key || project.id.slice(0, 4).toUpperCase();
  const createdDate = formatDate(project.created_at);

  return (
    <div className="flex flex-col bg-card border border-border/70 rounded-xl p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all gap-4">
      {/* Top Header: Project Name, Key, Settings */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-foreground truncate">
              {project.name}
            </h2>
            <Badge
              variant="outline"
              className="font-mono text-xs font-bold text-primary bg-primary/10 border-primary/20 shrink-0 uppercase tracking-wider"
            >
              {projectKey}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {project.description || 'No description provided for this project.'}
          </p>
          {createdDate && (
            <span className="text-[11px] text-muted-foreground/70 mt-1 block">
              Created {createdDate}
            </span>
          )}
        </div>

        <Link
          href={`/projects/${projectKey}/settings`}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors shrink-0"
          title="Project Settings"
        >
          <Settings size={16} />
        </Link>
      </div>

      {/* Running Sprint Status Section */}
      <div className="rounded-lg bg-muted/40 border border-border/50 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            <span>Active Sprint</span>
          </div>

          {activeSprint ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Running
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded bg-muted/60">
              No active sprint
            </span>
          )}
        </div>

        {sprintsLoading ? (
          <div className="h-6 w-3/4 bg-muted/60 rounded animate-pulse" />
        ) : activeSprint ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs text-foreground truncate">
                {activeSprint.name}
              </span>
              {(activeSprint.start_date || activeSprint.end_date) && (
                <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 shrink-0">
                  <Calendar size={11} />
                  {formatDate(activeSprint.start_date) || 'Started'} —{' '}
                  {formatDate(activeSprint.end_date) || 'Ongoing'}
                </span>
              )}
            </div>
            {activeSprint.goal && (
              <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                &ldquo;{activeSprint.goal}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>No sprint currently running</span>
            {plannedSprints.length > 0 && (
              <span className="text-primary font-medium">
                {plannedSprints.length} planned sprint{plannedSprints.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Project Members Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Users size={14} className="text-muted-foreground" />
            <span>Team Members</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {membersLoading ? 'Loading...' : `${members.length} joined`}
          </span>
        </div>

        {membersLoading ? (
          <div className="flex gap-1.5 py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-7 rounded-full bg-muted animate-pulse" />
            ))}
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-2">
            {/* Avatars Stack & List */}
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const userName = member.user?.name || member.user?.email || 'User';
                const roleName = member.role?.name || 'MEMBER';
                const initials = userName.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={member.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/40 text-xs text-foreground group"
                    title={`${userName} (${member.user?.email || ''}) - Role: ${roleName}`}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.user?.avatar_url || member.user?.avatarUrl} alt={userName} />
                      <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate max-w-[110px] text-[11px]">{userName}</span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-3.5 font-mono uppercase bg-background/80 text-muted-foreground"
                    >
                      {roleName}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">No members assigned yet.</p>
        )}
      </div>

      {/* Bottom Action Buttons: Board & Backlog */}
      <div className="pt-2 border-t border-border/50 flex items-center gap-2 mt-auto">
        <Link
          href={`/projects/${projectKey}/board`}
          className={buttonVariants({
            variant: 'default',
            size: 'sm',
            className: 'flex-1 h-8 text-xs font-semibold gap-1.5 shadow-xs',
          })}
        >
          <LayoutDashboard size={13} />
          <span>Open Board</span>
          <ArrowRight size={13} className="ml-auto" />
        </Link>

        <Link
          href={`/projects/${projectKey}/backlog`}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'h-8 text-xs font-medium gap-1.5',
          })}
        >
          <ListTree size={13} />
          <span>Backlog</span>
        </Link>
      </div>
    </div>
  );
}

export default function ProjectsListPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6 lg:p-8 space-y-6">
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
              <FolderKanban size={19} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Projects
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Overview of all active workspaces, members, and running sprints
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Create Project Button */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 shrink-0 shadow-xs"
          >
            <Plus size={14} />
            <span>Create Project</span>
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl border border-border/60 bg-card p-5 animate-pulse flex flex-col gap-4"
            >
              <div className="h-5 w-1/2 bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted/60 rounded" />
              <div className="h-16 w-full bg-muted/40 rounded mt-auto" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-border/70 rounded-xl p-8 bg-card/30">
          <FolderKanban size={36} className="mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No projects found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? `No projects matching "${search}". Try searching for another name or key.`
              : 'You do not have any projects in this workspace yet.'}
          </p>
          {!search && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 h-8 text-xs font-semibold gap-1.5"
            >
              <Plus size={14} />
              <span>Create your first project</span>
            </Button>
          )}
        </div>
      )}

      {/* Create Project Dialog Modal */}
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
