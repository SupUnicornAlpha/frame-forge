import type { AgentDef } from '../agent/types.js';
import type { AgentRegistry } from '../agent/registry.js';
import type { AgentRunner } from '../agent/runner.js';
import { createAgentContext } from '../agent/runner.js';
import type { EventBus } from '../events/bus.js';
import type { CommandQueue } from '../queue/types.js';
import type {
  EvaluationResult,
  PipelineDef,
  PipelineRunResult,
  PipelineStep,
} from './types.js';

export interface PipelineRunnerDeps {
  agentRegistry: AgentRegistry;
  agentRunner: AgentRunner;
  eventBus: EventBus;
  commandQueue: CommandQueue;
}

/**
 * Pipeline 执行引擎。
 *
 * 按步骤串行执行，每步支持：
 * - 反馈循环（FeedbackLoop）：输出不达标时重跑
 * - 并行分发（Parallel）：数组输入并发生成
 */
export class PipelineRunner {
  constructor(private readonly deps: PipelineRunnerDeps) {}

  async run(
    pipeline: PipelineDef,
    initialInput: unknown,
    taskId: string
  ): Promise<PipelineRunResult> {
    const startTime = Date.now();
    const stepResults: Record<string, unknown> = {};
    const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    this.deps.eventBus.emit({ type: 'task.started', taskId });

    let currentInput = initialInput;

    for (const step of pipeline.steps) {
      this.deps.eventBus.emit({
        type: 'pipeline.step.started',
        taskId,
        stepId: step.id,
        agentRole: step.agentRole,
      });

      try {
        const output = await this.deps.commandQueue.enqueue('pipeline', () =>
          this.runStep(step, currentInput, taskId, totalUsage)
        );

        stepResults[step.id] = output;
        currentInput = output;

        this.deps.eventBus.emit({
          type: 'pipeline.step.completed',
          taskId,
          stepId: step.id,
          output,
          durationMs: Date.now() - startTime,
        });
      } catch (err) {
        this.deps.eventBus.emit({
          type: 'pipeline.step.failed',
          taskId,
          stepId: step.id,
          error: (err as Error).message,
        });
        this.deps.eventBus.emit({
          type: 'task.failed',
          taskId,
          error: `Step "${step.id}" failed: ${(err as Error).message}`,
        });
        throw err;
      }
    }

    const result: PipelineRunResult = {
      taskId,
      pipelineId: pipeline.id,
      stepResults,
      durationMs: Date.now() - startTime,
      totalUsage,
    };

    this.deps.eventBus.emit({ type: 'task.completed', taskId, result });
    return result;
  }

  private async runStep(
    step: PipelineStep,
    input: unknown,
    taskId: string,
    totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  ): Promise<unknown> {
    const agentDef = this.deps.agentRegistry.get(step.agentRole);
    if (!agentDef) {
      throw new Error(`Agent with role "${step.agentRole}" not found in registry`);
    }

    if (step.parallel && Array.isArray(input)) {
      const results = await Promise.all(
        input.map((item) => this.runSingleAgentStep(agentDef, item, taskId, totalUsage))
      );
      return results;
    }

    return this.runWithFeedbackLoop(step, agentDef, input, taskId, totalUsage);
  }

  private async runWithFeedbackLoop(
    step: PipelineStep,
    agentDef: AgentDef,
    input: unknown,
    taskId: string,
    totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  ): Promise<unknown> {
    if (!step.feedbackLoop) {
      return this.runSingleAgentStep(agentDef, input, taskId, totalUsage);
    }

    const { evaluatorRole, passCondition, maxIterations } = step.feedbackLoop;
    const evaluatorDef = this.deps.agentRegistry.get(evaluatorRole);
    if (!evaluatorDef) {
      throw new Error(`Evaluator agent "${evaluatorRole}" not found`);
    }

    let currentInput = input;
    let lastOutput: unknown;
    let bestScore = 0;

    for (let i = 0; i < maxIterations; i++) {
      lastOutput = await this.runSingleAgentStep(agentDef, currentInput, taskId, totalUsage);

      const evaluation = await this.runSingleAgentStep(
        evaluatorDef,
        lastOutput,
        taskId,
        totalUsage
      ) as EvaluationResult;

      const defaultPassCondition = (score: number) => score >= 75;
      const passed = passCondition
        ? passCondition(lastOutput, evaluation)
        : defaultPassCondition(evaluation.score);

      if (evaluation.score > bestScore) bestScore = evaluation.score;

      this.deps.eventBus.emit({
        type: 'feedback.loop.iteration',
        taskId,
        stepId: step.id,
        iteration: i + 1,
        score: evaluation.score,
        passed,
      });

      if (passed) {
        this.deps.eventBus.emit({
          type: 'feedback.loop.passed',
          taskId,
          stepId: step.id,
          finalScore: evaluation.score,
        });
        return lastOutput;
      }

      currentInput = { ...((input as object) ?? {}), previousOutput: lastOutput, feedback: evaluation };
    }

    this.deps.eventBus.emit({
      type: 'feedback.loop.exhausted',
      taskId,
      stepId: step.id,
      bestScore,
    });

    return lastOutput;
  }

  private async runSingleAgentStep(
    agentDef: AgentDef,
    input: unknown,
    taskId: string,
    totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  ): Promise<unknown> {
    const ctx = createAgentContext({
      taskId,
      agentId: `${agentDef.id}-${Date.now()}`,
      role: agentDef.role,
    });

    this.deps.eventBus.emit({
      type: 'agent.run.started',
      taskId,
      agentId: ctx.agentId,
      role: agentDef.role,
    });

    const result = await this.deps.agentRunner.run(agentDef, input, ctx);

    totalUsage.inputTokens += result.usage.inputTokens;
    totalUsage.outputTokens += result.usage.outputTokens;
    totalUsage.totalTokens += result.usage.totalTokens;

    this.deps.eventBus.emit({
      type: 'agent.run.completed',
      taskId,
      agentId: ctx.agentId,
      role: agentDef.role,
      usage: result.usage,
      durationMs: result.durationMs,
    });

    return result.output;
  }
}
