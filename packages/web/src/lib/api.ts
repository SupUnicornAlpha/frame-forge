const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

function getAuthHeaders(): Record<string, string> {
  return {
    'X-Tenant-Id': process.env['NEXT_PUBLIC_TENANT_ID'] ?? 'default-tenant',
    'X-User-Id': process.env['NEXT_PUBLIC_USER_ID'] ?? 'demo-admin',
    'X-User-Role': process.env['NEXT_PUBLIC_USER_ROLE'] ?? 'admin',
  };
}

export interface Task {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  config: string;
  result: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskArtifact {
  id: string;
  taskId: string;
  type: string;
  url: string | null;
  content: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface TaskDetail extends Task {
  steps: Array<{
    id: string;
    stepId: string;
    agentRole: string;
    status: string;
    iterations: number | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  artifacts: TaskArtifact[];
}

export interface TaskChatResponse {
  reply: string;
  providerId: string;
  model: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  tasks: {
    list: () => apiFetch<Task[]>('/tasks'),
    get: (id: string) => apiFetch<TaskDetail>(`/tasks/${id}`),
    create: (data: { name: string; config: Record<string, unknown> }) =>
      apiFetch<{ id: string; status: string }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    pause: (id: string) =>
      apiFetch<{ status: string }>(`/tasks/${id}/pause`, { method: 'PATCH' }),
    delete: (id: string) =>
      fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE', headers: getAuthHeaders() }),
    artifacts: (id: string) => apiFetch<TaskArtifact[]>(`/tasks/${id}/artifacts`),
    chat: (id: string, payload: { message: string; providerId?: string; model?: string }) =>
      apiFetch<TaskChatResponse>(`/tasks/${id}/chat`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  providers: {
    list: () => apiFetch<{ llm: Array<{ id: string; type: string; supportedModels: string[] }> }>('/providers'),
  },
  settings: {
    listProviderSecrets: () =>
      apiFetch<{ providers: Array<{ providerId: string; configured: boolean; maskedToken: string; updatedAt: string }> }>(
        '/settings/providers'
      ),
    upsertProviderSecret: (payload: { providerId: string; token: string }) =>
      apiFetch<{ ok: boolean }>('/settings/providers', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    deleteProviderSecret: (providerId: string) =>
      apiFetch<{ ok: boolean }>(`/settings/providers/${providerId}`, {
        method: 'DELETE',
      }),
  },
  audit: {
    listLogs: (params?: { limit?: number; offset?: number; action?: string; status?: 'success' | 'denied' | 'error' }) => {
      const search = new URLSearchParams();
      if (params?.limit !== undefined) search.set('limit', String(params.limit));
      if (params?.offset !== undefined) search.set('offset', String(params.offset));
      if (params?.action) search.set('action', params.action);
      if (params?.status) search.set('status', params.status);
      const query = search.toString();
      return apiFetch<{ logs: Array<Record<string, unknown>>; pagination: { limit: number; offset: number } }>(
        `/audit/logs${query ? `?${query}` : ''}`
      );
    },
    cleanupLogs: (payload: { olderThanDays?: number }) =>
      apiFetch<{ ok: boolean; olderThanDays: number; cutoff: string; deleted: number }>(
        '/audit/logs/retention/cleanup',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
  },
};
