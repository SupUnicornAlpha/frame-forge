import type { AgentRole, TokenUsage } from '../agent/types.js';

/** 平台所有事件类型，用于 EventBus 的类型安全订阅 */
export type FrameForgeEvent =
  | TaskEvent
  | PipelineEvent
  | AgentEvent
  | FeedbackEvent
  | MediaEvent;

export type TaskEvent =
  | { type: 'task.created'; taskId: string; name: string }
  | { type: 'task.started'; taskId: string }
  | { type: 'task.completed'; taskId: string; result: unknown }
  | { type: 'task.failed'; taskId: string; error: string }
  | { type: 'task.paused'; taskId: string }
  | { type: 'task.resumed'; taskId: string };

export type PipelineEvent =
  | { type: 'pipeline.step.started'; taskId: string; stepId: string; agentRole: AgentRole }
  | {
      type: 'pipeline.step.completed';
      taskId: string;
      stepId: string;
      output: unknown;
      durationMs: number;
    }
  | { type: 'pipeline.step.failed'; taskId: string; stepId: string; error: string };

export type AgentEvent =
  | { type: 'agent.run.started'; taskId: string; agentId: string; role: AgentRole }
  | {
      type: 'agent.run.completed';
      taskId: string;
      agentId: string;
      role: AgentRole;
      usage: TokenUsage;
      durationMs: number;
    }
  | { type: 'agent.run.failed'; taskId: string; agentId: string; role: AgentRole; error: string };

export type FeedbackEvent =
  | {
      type: 'feedback.loop.iteration';
      taskId: string;
      stepId: string;
      iteration: number;
      score: number;
      passed: boolean;
    }
  | { type: 'feedback.loop.passed'; taskId: string; stepId: string; finalScore: number }
  | { type: 'feedback.loop.exhausted'; taskId: string; stepId: string; bestScore: number };

export type MediaEvent =
  | {
      type: 'media.generated';
      taskId: string;
      mediaType: 'image' | 'video';
      url: string;
      sceneId?: string | undefined;
    }
  | {
      type: 'media.generation.failed';
      taskId: string;
      mediaType: 'image' | 'video';
      error: string;
    };

/** 类型工具：从事件联合中提取特定 type 的事件 */
export type ExtractEvent<T extends FrameForgeEvent['type']> = Extract<
  FrameForgeEvent,
  { type: T }
>;
