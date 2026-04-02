const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
      fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' }),
    artifacts: (id: string) => apiFetch<TaskArtifact[]>(`/tasks/${id}/artifacts`),
  },
  providers: {
    list: () => apiFetch<{ llm: Array<{ id: string; type: string; supportedModels: string[] }> }>('/providers'),
  },
};
