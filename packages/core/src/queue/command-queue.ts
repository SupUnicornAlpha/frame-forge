import type { CommandQueue, LaneConfig, LaneName, QueuedCommand } from './types.js';
import { DEFAULT_LANES } from './types.js';

interface LaneState {
  config: LaneConfig;
  active: number;
  queue: Array<{
    cmd: QueuedCommand;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }>;
}

/**
 * 进程内 CommandQueue 实现。
 *
 * 每个 lane 独立维护 active 计数和等待队列。
 * 新任务入队后立即尝试执行（若并发槽位充足），否则排队等待。
 */
export class InMemoryCommandQueue implements CommandQueue {
  private readonly lanes = new Map<LaneName, LaneState>();
  private draining = false;

  constructor(laneConfigs: LaneConfig[] = DEFAULT_LANES) {
    for (const config of laneConfigs) {
      this.lanes.set(config.name, { config, active: 0, queue: [] });
    }
  }

  enqueue<T>(lane: LaneName, fn: () => Promise<T>, _priority = 0): Promise<T> {
    if (this.draining) {
      return Promise.reject(new Error('CommandQueue is draining, no new commands accepted'));
    }

    if (!this.lanes.has(lane)) {
      this.lanes.set(lane, {
        config: { name: lane, maxConcurrent: 1 },
        active: 0,
        queue: [],
      });
    }

    return new Promise<T>((resolve, reject) => {
      const cmd: QueuedCommand<T> = {
        id: crypto.randomUUID(),
        lane,
        priority: _priority,
        fn,
        createdAt: new Date(),
      };

      const state = this.lanes.get(lane)!;
      state.queue.push({
        cmd,
        resolve: resolve as (v: unknown) => void,
        reject,
      });

      this.tryFlushLane(lane);
    });
  }

  async drain(): Promise<void> {
    this.draining = true;
    const waits: Promise<void>[] = [];

    for (const [, state] of this.lanes) {
      if (state.active > 0 || state.queue.length > 0) {
        waits.push(
          new Promise<void>((resolve) => {
            const check = () => {
              if (state.active === 0 && state.queue.length === 0) {
                resolve();
              } else {
                setTimeout(check, 50);
              }
            };
            check();
          })
        );
      }
    }

    await Promise.all(waits);
  }

  getQueueLength(lane: LaneName): number {
    return this.lanes.get(lane)?.queue.length ?? 0;
  }

  getActiveConcurrency(lane: LaneName): number {
    return this.lanes.get(lane)?.active ?? 0;
  }

  private tryFlushLane(lane: LaneName): void {
    const state = this.lanes.get(lane);
    if (!state) return;

    while (state.queue.length > 0 && state.active < state.config.maxConcurrent) {
      const item = state.queue.shift()!;
      state.active++;

      item.cmd
        .fn()
        .then((result) => {
          item.resolve(result);
        })
        .catch((err) => {
          item.reject(err as Error);
        })
        .finally(() => {
          state.active--;
          this.tryFlushLane(lane);
        });
    }
  }
}
