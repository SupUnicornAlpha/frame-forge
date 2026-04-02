/**
 * Command Queue & Lanes 设计。
 *
 * 参考 OpenClaw 的 CommandQueue + Lanes 模式：
 * - 每个 lane 是一个 FIFO 队列，有独立的并发限制
 * - 同一 pipeline 的步骤走 pipeline lane（串行）
 * - 子 Agent 调用走 subagent lane（可有限并发）
 * - 定时任务走 cron lane
 */
export type LaneName = 'main' | 'pipeline' | 'subagent' | 'cron' | (string & Record<never, never>);

export interface LaneConfig {
  name: LaneName;
  maxConcurrent: number;
}

export const DEFAULT_LANES: LaneConfig[] = [
  { name: 'main', maxConcurrent: 1 },
  { name: 'pipeline', maxConcurrent: 1 },
  { name: 'subagent', maxConcurrent: 3 },
  { name: 'cron', maxConcurrent: 1 },
];

export interface QueuedCommand<T = unknown> {
  id: string;
  lane: LaneName;
  priority: number;
  fn: () => Promise<T>;
  createdAt: Date;
}

export interface CommandQueue {
  enqueue<T>(lane: LaneName, fn: () => Promise<T>, priority?: number): Promise<T>;
  drain(): Promise<void>;
  getQueueLength(lane: LaneName): number;
  getActiveConcurrency(lane: LaneName): number;
}
