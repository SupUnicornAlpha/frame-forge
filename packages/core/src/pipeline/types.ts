import type { ZodSchema } from 'zod';
import type { AgentRole } from '../agent/types.js';

/** Pipeline 中单个步骤定义 */
export interface PipelineStep<TIn = unknown, TOut = unknown> {
  id: string;
  agentRole: AgentRole;
  inputSchema?: ZodSchema<TIn> | undefined;
  outputSchema?: ZodSchema<TOut> | undefined;

  /**
   * 反馈循环配置。
   * 当步骤输出不满足条件时，由 evaluatorRole 的 Agent 评审，
   * 并将反馈注入重新执行，最多 maxIterations 轮。
   */
  feedbackLoop?:
    | {
        evaluatorRole: AgentRole;
        /** 评估函数，返回 true 表示通过，不传则以 evaluation.score >= 75 为准 */
        passCondition?: ((output: TOut, evaluation: EvaluationResult) => boolean) | undefined;
        maxIterations: number;
      }
    | undefined;

  /**
   * 并行处理。
   * 若为 true，则将数组形式的输入拆分为多个任务，并发调用同一 agentRole。
   * 用于多场景并发生成分镜图等场景。
   */
  parallel?: boolean | undefined;
}

/** Pipeline 声明式定义 */
export interface PipelineDef {
  id: string;
  name: string;
  steps: PipelineStep[];
}

/** Pipeline 执行时的进度事件 */
export interface PipelineProgressEvent {
  pipelineId: string;
  taskId: string;
  stepId: string;
  status: 'started' | 'completed' | 'failed' | 'waiting_feedback';
  progress: number;
  payload?: unknown;
}

/** 评审结果（由 Critic / Audience 等评审类 Agent 输出） */
export interface EvaluationResult {
  score: number;
  passed: boolean;
  dimensions: Record<string, number>;
  feedback: string;
  suggestions: string[];
}

/** Pipeline 运行结果 */
export interface PipelineRunResult {
  taskId: string;
  pipelineId: string;
  stepResults: Record<string, unknown>;
  durationMs: number;
  totalUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
