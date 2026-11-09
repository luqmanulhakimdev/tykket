export type IssueType = 'EPIC' | 'STORY' | 'TASK' | 'SUBTASK' | 'BUG';

export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BACKLOG';

export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'LOWEST' | 'HIGHEST';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  avatar_url?: string;
  auth_provider?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectRole {
  id: string;
  name: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | string;
  description?: string;
  created_at?: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  joined_at: string;
  user?: User;
  role?: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  owner_id: string;
  issue_counter: number;
  created_at: string;
  updated_at: string;
  owner?: User;
  members?: ProjectMember[];
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  created_at: string;
  updated_at: string;
}

export interface StatusDistribution {
  status: IssueStatus;
  count: number;
  points: number;
}

export interface PriorityDistribution {
  priority: IssuePriority;
  count: number;
}

export interface SprintBurndownPoint {
  date: string;
  remaining_points: number;
  ideal_points: number;
}

export interface SprintMetrics {
  sprint_id: string;
  sprint_name: string;
  total_issues: number;
  completed_issues: number;
  total_points: number;
  completed_points: number;
  status_distribution: StatusDistribution[];
  burndown: SprintBurndownPoint[];
}

export interface ProjectSummaryMetrics {
  project_id: string;
  total_issues: number;
  total_sprints: number;
  status_distribution: StatusDistribution[];
  priority_distribution: PriorityDistribution[];
}

export interface Issue {
  id: string; // UUID
  key: string; // e.g. "TYK-101"
  title: string;
  description?: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  position: number;
  project_id?: string;
  projectId?: string;
  sprint_id?: string | null;
  sprintId?: string | null;
  parent_id?: string | null;
  parentId?: string | null;
  issue_number?: number;
  issueNumber?: number;
  reporter_id?: string;
  reporterId?: string;
  assignee_id?: string | null;
  assigneeId?: string | null;
  story_points?: number;
  storyPoints?: number;
  reporter?: User;
  assignee?: User;
  parent?: Issue;
  subtasks?: Issue[];
  deletedAt?: string;
  deleted_at?: string;
  deletedBy?: User;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface Column {
  id: IssueStatus;
  title: string;
  issues: Issue[];
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  type: IssueType;
  status?: IssueStatus;
  priority: IssuePriority;
  parentId?: string;
  parent_id?: string;
  assigneeId?: string;
  assignee_id?: string;
  sprintId?: string;
  sprint_id?: string;
  storyPoints?: number;
  story_points?: number;
  position?: number;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
  priority?: IssuePriority;
  parentId?: string;
  parent_id?: string;
  assigneeId?: string;
  assignee_id?: string;
  sprintId?: string;
  sprint_id?: string;
  storyPoints?: number;
  story_points?: number;
  position?: number;
}

export interface MoveIssueInput {
  status?: IssueStatus;
  position: number;
  sprint_id?: string;
  sprintId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
  error?: unknown;
}

export function normalizeIssue(raw: Record<string, unknown> | Issue): Issue {
  if (!raw) return raw as unknown as Issue;

  const rawObj = raw as Record<string, unknown>;
  const rawAssignee = rawObj.assignee as Record<string, unknown> | undefined;
  const rawReporter = rawObj.reporter as Record<string, unknown> | undefined;

  const assignee: User | undefined = rawAssignee
    ? {
        id: String(rawAssignee.id || ''),
        name: String(rawAssignee.name || ''),
        email: rawAssignee.email ? String(rawAssignee.email) : undefined,
        avatarUrl:
          (rawAssignee.avatarUrl as string) ||
          (rawAssignee.avatar_url as string) ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${rawAssignee.name || rawAssignee.id}`,
      }
    : undefined;

  const reporter: User | undefined = rawReporter
    ? {
        id: String(rawReporter.id || ''),
        name: String(rawReporter.name || ''),
        email: rawReporter.email ? String(rawReporter.email) : undefined,
        avatarUrl:
          (rawReporter.avatarUrl as string) ||
          (rawReporter.avatar_url as string) ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${rawReporter.name || rawReporter.id}`,
      }
    : undefined;

  let priority = (rawObj.priority as IssuePriority) || 'MEDIUM';
  if ((priority as string) === 'HIGHEST') priority = 'URGENT';
  if ((priority as string) === 'LOWEST') priority = 'LOW';

  const subtasks = Array.isArray(rawObj.subtasks)
    ? (rawObj.subtasks as Record<string, unknown>[]).map(normalizeIssue)
    : undefined;

  return {
    ...rawObj,
    id: String(rawObj.id || ''),
    key: String(rawObj.key || ''),
    title: String(rawObj.title || ''),
    description: rawObj.description !== undefined ? String(rawObj.description) : undefined,
    type: (rawObj.type as IssueType) || 'TASK',
    status: (rawObj.status as IssueStatus) || 'TODO',
    priority: priority || 'MEDIUM',
    position: typeof rawObj.position === 'number' ? rawObj.position : 1000.0,
    projectId: (rawObj.project_id as string) || (rawObj.projectId as string),
    project_id: (rawObj.project_id as string) || (rawObj.projectId as string),
    sprintId: (rawObj.sprint_id as string) || (rawObj.sprintId as string),
    sprint_id: (rawObj.sprint_id as string) || (rawObj.sprintId as string),
    parentId: (rawObj.parent_id as string) || (rawObj.parentId as string),
    parent_id: (rawObj.parent_id as string) || (rawObj.parentId as string),
    storyPoints: (rawObj.story_points as number) ?? (rawObj.storyPoints as number),
    story_points: (rawObj.story_points as number) ?? (rawObj.storyPoints as number),
    assignee,
    assigneeId: (rawObj.assignee_id as string) || (rawObj.assigneeId as string),
    assignee_id: (rawObj.assignee_id as string) || (rawObj.assigneeId as string),
    reporter,
    reporterId: (rawObj.reporter_id as string) || (rawObj.reporterId as string),
    reporter_id: (rawObj.reporter_id as string) || (rawObj.reporterId as string),
    createdAt: (rawObj.created_at as string) || (rawObj.createdAt as string) || new Date().toISOString(),
    created_at: (rawObj.created_at as string) || (rawObj.createdAt as string),
    updatedAt: (rawObj.updated_at as string) || (rawObj.updatedAt as string) || new Date().toISOString(),
    updated_at: (rawObj.updated_at as string) || (rawObj.updatedAt as string),
    deletedAt: (rawObj.deleted_at as string) || (rawObj.deletedAt as string),
    deleted_at: (rawObj.deleted_at as string) || (rawObj.deletedAt as string),
    subtasks,
  };
}
