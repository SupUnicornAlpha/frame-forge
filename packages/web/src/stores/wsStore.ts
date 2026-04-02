'use client';

import { create } from 'zustand';
import { useTaskStore } from './taskStore';

const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3001/ws';

interface WsEvent {
  type: string;
  taskId?: string;
  stepId?: string;
  agentRole?: string;
  status?: string;
  score?: number;
  [key: string]: unknown;
}

interface WsStore {
  ws: WebSocket | null;
  connected: boolean;
  events: WsEvent[];
  connect: () => void;
  disconnect: () => void;
  subscribe: (taskId: string) => void;
  clearEvents: () => void;
}

export const useWsStore = create<WsStore>((set, get) => ({
  ws: null,
  connected: false,
  events: [],

  connect: () => {
    if (get().ws) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => set({ connected: true });
    ws.onclose = () => set({ connected: false, ws: null });

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data as string) as WsEvent;
        set((state) => ({ events: [...state.events.slice(-99), event] }));

        if (event.taskId && event.type?.startsWith('task.')) {
          const status = event.type.replace('task.', '') as
            | 'pending'
            | 'running'
            | 'paused'
            | 'completed'
            | 'failed';
          useTaskStore.getState().updateTaskStatus(event.taskId, status);
        }
      } catch {
        // ignore
      }
    };

    set({ ws });
  },

  disconnect: () => {
    get().ws?.close();
    set({ ws: null, connected: false });
  },

  subscribe: (taskId: string) => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', taskId }));
    }
  },

  clearEvents: () => set({ events: [] }),
}));
