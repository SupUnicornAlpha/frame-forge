import type { AgentContext } from '../agent/types.js';
import type { LLMToolCall } from '../llm/types.js';
import type { ToolDef, ToolRegistry } from './types.js';

export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  output: unknown;
  error?: string | undefined;
}

/**
 * 工具调用编排器。
 *
 * 策略：
 * - isConcurrencySafe=true 的工具并行执行
 * - 其它工具串行执行
 */
export class ToolOrchestrator {
  constructor(private readonly toolRegistry: ToolRegistry) {}

  async runToolCalls(
    toolCalls: LLMToolCall[],
    localTools: ToolDef[],
    ctx: AgentContext
  ): Promise<ToolExecutionResult[]> {
    const resolved = toolCalls.map((call) => ({
      call,
      tool: localTools.find((t) => t.name === call.name) ?? this.toolRegistry.get(call.name),
    }));

    const missing = resolved.find((r) => !r.tool);
    if (missing) {
      throw new Error(`Tool "${missing.call.name}" not found`);
    }

    const safe = resolved.filter((r) => r.tool?.isConcurrencySafe);
    const unsafe = resolved.filter((r) => !r.tool?.isConcurrencySafe);

    const safeResults = await Promise.all(safe.map((r) => this.executeOne(r.call, r.tool!, ctx)));
    const unsafeResults: ToolExecutionResult[] = [];
    for (const item of unsafe) {
      unsafeResults.push(await this.executeOne(item.call, item.tool!, ctx));
    }

    const order = new Map(toolCalls.map((c, i) => [c.id, i]));
    return [...safeResults, ...unsafeResults].sort(
      (a, b) => (order.get(a.toolCallId) ?? 0) - (order.get(b.toolCallId) ?? 0)
    );
  }

  private async executeOne(
    call: LLMToolCall,
    tool: ToolDef,
    ctx: AgentContext
  ): Promise<ToolExecutionResult> {
    try {
      const parsed = tool.inputSchema.parse(call.arguments);
      const output = await tool.execute(parsed, ctx);
      return { toolCallId: call.id, toolName: call.name, output };
    } catch (error) {
      return {
        toolCallId: call.id,
        toolName: call.name,
        output: null,
        error: (error as Error).message,
      };
    }
  }
}

