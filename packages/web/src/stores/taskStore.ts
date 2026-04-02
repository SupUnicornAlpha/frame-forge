'use client';

import { create } from 'zustand';
import type { Task, TaskDetail } from '@/lib/api';

interface TaskStore {
  tasks: Task[];
  activeTask: TaskDetail | null;
  isLoading: boolean;
  error: string | null;

  setTasks: (tasks: Task[]) => void;
  setActiveTask: (task: TaskDetail | null) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  activeTask: null,
  isLoading: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),
  setActiveTask: (task) => set({ activeTask: task }),
  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      activeTask:
        state.activeTask?.id === taskId ? { ...state.activeTask, status } : state.activeTask,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
