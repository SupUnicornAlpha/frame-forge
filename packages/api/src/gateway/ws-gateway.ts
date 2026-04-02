import type { WebSocket } from '@fastify/websocket';
import type { EventBus, FrameForgeEvent } from '@frame-forge/core';

interface Subscription {
  ws: WebSocket;
  taskIds: Set<string>;
}

/**
 * WebSocket Gateway。
 *
 * 参考 OpenClaw 的 Gateway 模式：订阅 EventBus 上的任务事件，
 * 并通过 WebSocket 实时推送给客户端。
 *
 * 客户端订阅协议：
 * { "type": "subscribe", "taskId": "xxx" }
 * { "type": "unsubscribe", "taskId": "xxx" }
 */
export class WsGateway {
  private readonly subscriptions = new Map<string, Subscription>();
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly eventBus: EventBus) {
    this.subscribeToEvents();
  }

  addConnection(connectionId: string, ws: WebSocket): void {
    this.subscriptions.set(connectionId, { ws, taskIds: new Set() });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: 'subscribe' | 'unsubscribe';
          taskId: string;
        };
        const sub = this.subscriptions.get(connectionId);
        if (!sub) return;

        if (msg.type === 'subscribe') {
          sub.taskIds.add(msg.taskId);
          ws.send(JSON.stringify({ type: 'subscribed', taskId: msg.taskId }));
        } else if (msg.type === 'unsubscribe') {
          sub.taskIds.delete(msg.taskId);
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      this.subscriptions.delete(connectionId);
    });
  }

  private subscribeToEvents(): void {
    const taskEventTypes: FrameForgeEvent['type'][] = [
      'task.started',
      'task.completed',
      'task.failed',
      'task.paused',
      'task.resumed',
      'pipeline.step.started',
      'pipeline.step.completed',
      'pipeline.step.failed',
      'agent.run.started',
      'agent.run.completed',
      'feedback.loop.iteration',
      'feedback.loop.passed',
      'feedback.loop.exhausted',
      'media.generated',
    ];

    for (const eventType of taskEventTypes) {
      const unsub = this.eventBus.on(eventType, (event) => {
        const taskId = (event as { taskId?: string }).taskId;
        if (!taskId) return;
        this.broadcast(taskId, event);
      });
      this.unsubscribers.push(unsub);
    }
  }

  private broadcast(taskId: string, event: FrameForgeEvent): void {
    const message = JSON.stringify(event);
    for (const [, sub] of this.subscriptions) {
      if (sub.taskIds.has(taskId) && sub.ws.readyState === 1) {
        sub.ws.send(message);
      }
    }
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
