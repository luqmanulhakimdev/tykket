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
  Comment,
  normalizeComment,
  ProjectSummaryMetrics,
  SprintMetrics,
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

// Response interceptor: automatically refresh access token on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('tykket_refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const data = refreshRes.data?.data;
        const newAccessToken = data?.tokens?.access_token;
        const newRefreshToken = data?.tokens?.refresh_token;

        if (newAccessToken) {
          localStorage.setItem('tykket_auth_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('tykket_refresh_token', newRefreshToken);
          }
          document.cookie = `tykket_auth_token=${newAccessToken}; path=/; max-age=604800; SameSite=Lax`;
          window.dispatchEvent(new Event('tykket_auth_change'));

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('tykket_auth_token');
        localStorage.removeItem('tykket_refresh_token');
        localStorage.removeItem('tykket_auth_user');
        window.dispatchEvent(new Event('tykket_auth_change'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

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

  update: async (
    projectIdOrKey: string,
    sprintId: string,
    data: { name: string; goal?: string; start_date?: string; end_date?: string }
  ): Promise<Sprint> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Sprint>> = await apiClient.put(
      `/projects/${id}/sprints/${sprintId}`,
      data
    );
    return res.data.data;
  },

  delete: async (
    projectIdOrKey: string,
    sprintId: string
  ): Promise<void> => {
    const id = await resolveProjectId(projectIdOrKey);
    await apiClient.delete(`/projects/${id}/sprints/${sprintId}`);
  },

  bulkMove: async (
    projectIdOrKey: string,
    data: { issue_ids: string[]; sprint_id: string | null }
  ): Promise<void> => {
    const id = await resolveProjectId(projectIdOrKey);
    await apiClient.post(`/projects/${id}/sprints/bulk-move`, data);
  },
};

// ----------------------------------------------------------------------
// Metrics & Reporting API
// ----------------------------------------------------------------------
export const metricsApi = {
  getProjectMetrics: async (projectIdOrKey: string): Promise<ProjectSummaryMetrics> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<ProjectSummaryMetrics>> = await apiClient.get(
      `/projects/${id}/metrics`
    );
    return res.data.data;
  },

  getSprintBurndown: async (
    projectIdOrKey: string,
    sprintId: string
  ): Promise<SprintMetrics> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<SprintMetrics>> = await apiClient.get(
      `/projects/${id}/sprints/${sprintId}/burndown`
    );
    return res.data.data;
  },

  exportCSV: async (
    projectIdOrKey: string,
    filters?: {
      sprint_id?: string;
      in_backlog?: boolean;
      status?: string;
      assignee_id?: string;
    }
  ): Promise<Blob> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res = await apiClient.get(`/projects/${id}/export/csv`, {
      params: filters,
      responseType: 'blob',
    });
    return res.data;
  },

  exportSummary: async (projectIdOrKey: string): Promise<Record<string, unknown>> => {
    const id = await resolveProjectId(projectIdOrKey);
    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.get(
      `/projects/${id}/export/summary`
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

// ----------------------------------------------------------------------
// Asset & Upload API
// ----------------------------------------------------------------------
export function getBackendAssetUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export interface UploadResult {
  location: string;
  url: string;
  filename: string;
  size: number;
  mimetype?: string;
}

export const uploadApi = {
  uploadFile: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<UploadResult> & { location?: string; url?: string; filename?: string; size?: number }>(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    const data = res.data;
    const rawUrl = data.location || data.url || data.data?.location || data.data?.url || '';
    const fullUrl = getBackendAssetUrl(rawUrl);
    return {
      location: fullUrl,
      url: fullUrl,
      filename: data.filename || data.data?.filename || file.name,
      size: data.size || data.data?.size || file.size,
      mimetype: data.data?.mimetype || file.type,
    };
  },
};

// ----------------------------------------------------------------------
// Comments API
// ----------------------------------------------------------------------
export const commentsApi = {
  getComments: async (issueId: string): Promise<Comment[]> => {
    if (!issueId) return [];
    try {
      const res: AxiosResponse<ApiResponse<Record<string, unknown>[]>> = await apiClient.get(
        `/issues/${issueId}/comments`
      );
      const items = res.data.data || [];
      return items.map(normalizeComment);
    } catch (err) {
      console.warn('Failed to load comments for issue:', issueId, err);
      return [];
    }
  },

  createComment: async (
    issueId: string,
    content: string,
    parentId?: string | null
  ): Promise<Comment> => {
    const payload: { content: string; parent_id?: string } = { content };
    if (parentId) {
      payload.parent_id = parentId;
    }
    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.post(
      `/issues/${issueId}/comments`,
      payload
    );
    return normalizeComment(res.data.data);
  },

  updateComment: async (commentId: string, content: string): Promise<Comment> => {
    const res: AxiosResponse<ApiResponse<Record<string, unknown>>> = await apiClient.put(
      `/comments/${commentId}`,
      { content }
    );
    return normalizeComment(res.data.data);
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },
};

export default apiClient;
