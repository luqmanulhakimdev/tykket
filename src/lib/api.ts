import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  CreateIssueInput,
  Issue,
  MoveIssueInput,
  Project,
  ProjectMember,
  Sprint,
  UpdateIssueInput,
  User,
  normalizeIssue,
} from '@/types/issue';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach Authorization Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tykket_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Cache for project key -> project ID (UUID)
const projectKeyToIdMap = new Map<string, string>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveProjectId(projectKeyOrId = 'TYK'): Promise<string> {
  if (UUID_REGEX.test(projectKeyOrId)) {
    return projectKeyOrId;
  }

  const upperKey = projectKeyOrId.toUpperCase();
  if (projectKeyToIdMap.has(upperKey)) {
    return projectKeyToIdMap.get(upperKey)!;
  }

  try {
    const projects = await projectsApi.list();
    for (const p of projects) {
      if (p.key) {
        projectKeyToIdMap.set(p.key.toUpperCase(), p.id);
      }
    }
    const matched = projectKeyToIdMap.get(upperKey);
    if (matched) return matched;
  } catch (err) {
    console.warn('Could not resolve project ID from key:', projectKeyOrId, err);
  }

  return projectKeyOrId;
}

// ----------------------------------------------------------------------
// Auth API
// ----------------------------------------------------------------------
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthSuccessData {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthSuccessData> => {
    const res: AxiosResponse<ApiResponse<AuthSuccessData>> = await apiClient.post(
      '/auth/login',
      {
        email: payload.email,
        password: payload.password,
      }
    );
    return res.data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthSuccessData> => {
    const res: AxiosResponse<ApiResponse<AuthSuccessData>> = await apiClient.post(
      '/auth/register',
      {
        name: payload.name,
        email: payload.email,
        password: payload.password,
      }
    );
    return res.data.data;
  },

  getMe: async (): Promise<User> => {
    const res: AxiosResponse<ApiResponse<User>> = await apiClient.get('/auth/me');
    return res.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthSuccessData> => {
    const res: AxiosResponse<ApiResponse<AuthSuccessData>> = await apiClient.post(
      '/auth/refresh',
      {
        refresh_token: refreshToken,
      }
    );
    return res.data.data;
  },
};

// ----------------------------------------------------------------------
// Projects API
// ----------------------------------------------------------------------
export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res: AxiosResponse<ApiResponse<Project[]>> = await apiClient.get('/projects');
    const projects = res.data.data || [];
    projects.forEach((p) => {
      if (p.key) projectKeyToIdMap.set(p.key.toUpperCase(), p.id);
    });
    return projects;
  },

  get: async (projectIdOrKey: string): Promise<Project> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Project>> = await apiClient.get(
      `/projects/${id}`
    );
    return res.data.data;
  },

  getMembers: async (projectIdOrKey: string): Promise<ProjectMember[]> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<ProjectMember[]>> = await apiClient.get(
      `/projects/${id}/members`
    );
    return res.data.data || [];
  },

  create: async (data: { name: string; key: string; description?: string }): Promise<Project> => {
    const res: AxiosResponse<ApiResponse<Project>> = await apiClient.post(
      '/projects',
      data
    );
    const proj = res.data.data;
    if (proj?.key) projectKeyToIdMap.set(proj.key.toUpperCase(), proj.id);
    return proj;
  },

  update: async (
    projectIdOrKey: string,
    data: { name: string; description?: string }
  ): Promise<Project> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Project>> = await apiClient.put(
      `/projects/${id}`,
      data
    );
    return res.data.data;
  },

  addMember: async (
    projectIdOrKey: string,
    data: { email: string; role_name: string }
  ): Promise<ProjectMember> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<ProjectMember>> = await apiClient.post(
      `/projects/${id}/members`,
      data
    );
    return res.data.data;
  },

  removeMember: async (
    projectIdOrKey: string,
    userId: string
  ): Promise<void> => {
    const id = await resolveProjectId(projectIdOrKey);
    await apiClient.delete(`/projects/${id}/members/${userId}`);
  },
};

// ----------------------------------------------------------------------
// Sprints API
// ----------------------------------------------------------------------
export const sprintsApi = {
  list: async (projectIdOrKey: string): Promise<Sprint[]> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Sprint[]>> = await apiClient.get(
      `/projects/${id}/sprints`
    );
    return res.data.data || [];
  },

  create: async (
    projectIdOrKey: string,
    data: { name: string; goal?: string; start_date?: string; end_date?: string }
  ): Promise<Sprint> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Sprint>> = await apiClient.post(
      `/projects/${id}/sprints`,
      data
    );
    return res.data.data;
  },

  start: async (
    projectIdOrKey: string,
    sprintId: string,
    data?: { start_date?: string; end_date?: string }
  ): Promise<Sprint> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Sprint>> = await apiClient.post(
      `/projects/${id}/sprints/${sprintId}/start`,
      data || {}
    );
    return res.data.data;
  },

  complete: async (
    projectIdOrKey: string,
    sprintId: string,
    data?: { move_incomplete_to_sprint_id?: string }
  ): Promise<Sprint> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Sprint>> = await apiClient.post(
      `/projects/${id}/sprints/${sprintId}/complete`,
      data || {}
    );
    return res.data.data;
  },
};

// ----------------------------------------------------------------------
// Issues API
// ----------------------------------------------------------------------
export interface IssueFilterParams {
  search?: string;
  status?: string;
  type?: string;
  assignee_id?: string;
  parent_id?: string;
  sprint_id?: string;
  in_backlog?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

export const issuesApi = {
  getIssues: async (
    projectIdOrKey = 'TYK',
    params?: IssueFilterParams
  ): Promise<Issue[]> => {
    const id = await resolveProjectId(projectIdOrKey);
    const queryParams: Record<string, unknown> = { limit: 100, ...params };
    if (params?.in_backlog !== undefined) {
      queryParams.in_backlog = params.in_backlog ? 'true' : 'false';
    }

    const res: AxiosResponse<ApiResponse<Record<string, unknown>[]>> = await apiClient.get(
      `/projects/${id}/issues`,
      { params: queryParams }
    );
    const items = res.data.data || [];
    return items.map(normalizeIssue);
  },

  getIssue: async (projectIdOrKey: string, issueId: string): Promise<Issue> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.get(
      `/projects/${id}/issues/${issueId}`
    );
    return normalizeIssue(res.data.data);
  },

  getIssueByKey: async (key: string): Promise<Issue> => {
    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.get(
      `/issues/${key}`
    );
    return normalizeIssue(res.data.data);
  },

  createIssue: async (
    projectIdOrKey: string,
    data: CreateIssueInput
  ): Promise<Issue> => {
    const id = await resolveProjectId(projectIdOrKey);

    let priority = data.priority;
    if (priority === 'HIGHEST') priority = 'URGENT';
    if (priority === 'LOWEST') priority = 'LOW';

    let status = data.status;
    if (status === 'BACKLOG') status = 'TODO';

    const payload: Record<string, unknown> = {
      title: data.title,
      type: data.type,
      priority: priority || 'MEDIUM',
    };

    if (data.description) payload.description = data.description;
    if (status) payload.status = status;
    if (data.position !== undefined) payload.position = data.position;
    if (data.assigneeId || data.assignee_id) {
      payload.assignee_id = data.assigneeId || data.assignee_id;
    }
    if (data.parentId || data.parent_id) {
      payload.parent_id = data.parentId || data.parent_id;
    }
    if (data.sprintId || data.sprint_id) {
      payload.sprint_id = data.sprintId || data.sprint_id;
    }
    if (data.storyPoints !== undefined || data.story_points !== undefined) {
      payload.story_points = data.storyPoints ?? data.story_points;
    }

    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.post(
      `/projects/${id}/issues`,
      payload
    );
    return normalizeIssue(res.data.data);
  },

  updateIssue: async (
    projectIdOrKey: string,
    issueId: string,
    data: UpdateIssueInput
  ): Promise<Issue> => {
    const id = await resolveProjectId(projectIdOrKey);

    const payload: Record<string, unknown> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.type !== undefined) payload.type = data.type;

    if (data.priority !== undefined) {
      let p = data.priority;
      if (p === 'HIGHEST') p = 'URGENT';
      if (p === 'LOWEST') p = 'LOW';
      payload.priority = p;
    }

    if (data.assigneeId !== undefined || data.assignee_id !== undefined) {
      payload.assignee_id = data.assigneeId || data.assignee_id || null;
    }
    if (data.parentId !== undefined || data.parent_id !== undefined) {
      payload.parent_id = data.parentId || data.parent_id || null;
    }
    if (data.sprintId !== undefined || data.sprint_id !== undefined) {
      payload.sprint_id = data.sprintId || data.sprint_id || null;
    }
    if (data.storyPoints !== undefined || data.story_points !== undefined) {
      payload.story_points = data.storyPoints ?? data.story_points;
    }

    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.put(
      `/projects/${id}/issues/${issueId}`,
      payload
    );
    return normalizeIssue(res.data.data);
  },

  moveIssue: async (
    projectIdOrKey: string,
    issueId: string,
    data: MoveIssueInput
  ): Promise<Issue> => {
    const id = await resolveProjectId(projectIdOrKey);

    const payload: Record<string, unknown> = {
      position: data.position,
    };
    if (data.status) {
      let st = data.status;
      if (st === 'BACKLOG') st = 'TODO';
      payload.status = st;
    }
    if (data.sprint_id || data.sprintId) {
      payload.sprint_id = data.sprint_id || data.sprintId;
    }

    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.patch(
      `/projects/${id}/issues/${issueId}/move`,
      payload
    );
    return normalizeIssue(res.data.data);
  },

  deleteIssue: async (projectIdOrKey: string, issueId: string): Promise<void> => {
    const id = await resolveProjectId(projectIdOrKey);
    await apiClient.delete(`/projects/${id}/issues/${issueId}`);
  },

  getTrashIssues: async (projectIdOrKey: string): Promise<Issue[]> => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(`tykket_trash_${projectIdOrKey}`);
      if (saved) return JSON.parse(saved).map(normalizeIssue);
    } catch {
      // Ignore parse errors
    }
    return [];
  },

  restoreIssue: async (
    projectIdOrKey: string,
    issue: Issue
  ): Promise<Issue> => {
    // If backend soft delete has no direct restore endpoint yet,
    // re-create issue in backend with existing attributes
    return await issuesApi.createIssue(projectIdOrKey, {
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status === 'BACKLOG' ? 'TODO' : issue.status,
      priority: issue.priority,
      parentId: issue.parentId || issue.parent_id || undefined,
      assigneeId: issue.assigneeId || issue.assignee_id || issue.assignee?.id || undefined,
      position: issue.position,
    });
  },

  permanentDeleteIssue: async (
    projectIdOrKey: string,
    issueId: string
  ): Promise<void> => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tykket_trash_${projectIdOrKey}`);
      if (saved) {
        const list = (JSON.parse(saved) as Record<string, unknown>[]).filter(
          (i) => i.id !== issueId
        );
        localStorage.setItem(`tykket_trash_${projectIdOrKey}`, JSON.stringify(list));
      }
    }
  },
};

export default apiClient;
