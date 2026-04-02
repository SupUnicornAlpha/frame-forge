import type { AgentContext, AgentDef, AgentMessage, AgentRunResult, TokenUsage } from './types.js';
import type { LLMProviderRegistry } from '../llm/types.js';
import type { ToolRegistry } from '../tool/types.js';

/**
 * AgentRunner 接口：执行 AgentDef 的核心运行时。
 *
 * 参考 claude-code 的 query() 循环设计：
 * 1. 构造初始消息（system prompt + user input）
 * 2. 调用 LLM 获取回复
 * 3. 如果有 tool_calls，执行工具并将结果追加到消息
 * 4. 重复直到 finish_reason === 'stop' 或达到 maxTurns
 * 5. 解析最终 assistant 回复为 TOutput
 */
export interface AgentRunner {
  run<TInput, TOutput>(
    def: AgentDef<TInput, TOutput>,
    input: TInput,
    ctx: AgentContext
  ): Promise<AgentRunResult<TOutput>>;
}

/** 创建 AgentContext 的工厂函数 */
export function createAgentContext(params: {
  taskId: string;
  agentId: string;
  role: string;
  parentContext?: AgentContext;
  metadata?: Record<string, unknown>;
}): AgentContext {
  return {
    taskId: params.taskId,
    agentId: params.agentId,
    role: params.role,
    parentContext: params.parentContext,
    sessionHistory: [],
    metadata: params.metadata ?? {},
  };
}

/** 从父上下文创建子上下文（参考 claude-code createSubagentContext） */
export function createSubagentContext(
  parentCtx: AgentContext,
  params: {
    agentId: string;
    role: string;
    metadata?: Record<string, unknown>;
  }
): AgentContext {
  return {
    taskId: parentCtx.taskId,
    agentId: params.agentId,
    role: params.role,
    parentContext: parentCtx,
    sessionHistory: [],
    metadata: { ...parentCtx.metadata, ...params.metadata },
  };
}

/**
 * 标准 AgentRunner 实现：工具循环式 Agent 执行引擎。
 */
export class StandardAgentRunner implements AgentRunner {
  constructor(
    private readonly llmRegistry: LLMProviderRegistry,
    private readonly toolRegistry: ToolRegistry
  ) {}

  async run<TInput, TOutput>(
    def: AgentDef<TInput, TOutput>,
    input: TInput,
    ctx: AgentContext
  ): Promise<AgentRunResult<TOutput>> {
    const startTime = Date.now();
    const messages: AgentMessage[] = [];
    const maxTurns = def.maxTurns ?? 10;
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    await def.hooks?.beforeRun?.(ctx, input);

    try {
      const systemPrompt =
        typeof def.systemPrompt === 'function' ? def.systemPrompt(ctx) : def.systemPrompt;

      messages.push({
        role: 'system',
        content: systemPrompt,
        timestamp: new Date(),
      });

      messages.push({
        role: 'user',
        content: JSON.stringify(input),
        timestamp: new Date(),
      });

      const provider = this.llmRegistry.get(def.llmConfig.providerId);
      let output: TOutput | undefined;

      for (let turn = 0; turn < maxTurns; turn++) {
        await def.hooks?.onTurn?.(ctx, turn);

        const response = await provider.complete({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            toolCallId: m.toolCallId,
            toolCalls: m.toolCalls,
          })),
          model: def.llmConfig.model,
          temperature: def.llmConfig.temperature,
          maxTokens: def.llmConfig.maxTokens,
          tools: def.tools,
        });

        totalUsage.inputTokens += response.usage.inputTokens;
        totalUsage.outputTokens += response.usage.outputTokens;
        totalUsage.totalTokens += response.usage.totalTokens;

        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: response.message.content as string,
          toolCalls: response.message.toolCalls,
          timestamp: new Date(),
        };
        messages.push(assistantMsg);
        ctx.sessionHistory.push(assistantMsg);

        if (response.finishReason === 'stop') {
          output = this.parseOutput<TOutput>(response.message.content as string, def);
          break;
        }

        if (response.finishReason === 'tool_calls' && response.message.toolCalls?.length) {
          for (const toolCall of response.message.toolCalls) {
            const toolDef = def.tools.find((t) => t.name === toolCall.name)
              ?? this.toolRegistry.get(toolCall.name);

            if (!toolDef) {
              throw new Error(`Tool "${toolCall.name}" not found`);
            }

            const toolResult = await toolDef.execute(toolCall.arguments, ctx);
            const toolMsg: AgentMessage = {
              role: 'tool',
              content: JSON.stringify(toolResult),
              toolCallId: toolCall.id,
              timestamp: new Date(),
            };
            messages.push(toolMsg);
            ctx.sessionHistory.push(toolMsg);
          }
        }
      }

      if (output === undefined) {
        throw new Error(`Agent "${def.role}" reached maxTurns (${maxTurns}) without producing output`);
      }

      await def.hooks?.afterRun?.(ctx, output);

      return {
        output,
        sessionHistory: messages,
        usage: totalUsage,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      await def.hooks?.onError?.(ctx, error as Error);
      throw error;
    }
  }

  private parseOutput<TOutput>(content: string, def: AgentDef): TOutput {
    if (!def.outputSchema) {
      try {
        return JSON.parse(content) as TOutput;
      } catch {
        return content as unknown as TOutput;
      }
    }

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
    const jsonStr = jsonMatch?.[1]?.trim() ?? content.trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return def.outputSchema.parse(parsed) as TOutput;
    } catch {
      throw new Error(
        `Agent "${def.role}" output could not be parsed as expected schema. Raw: ${content.slice(0, 200)}`
      );
    }
  }
}
