import type { ZodSchema } from 'zod';
import type { AgentContext } from '../agent/types.js';

/**
 * 工具定义接口。
 *
 * 参考 claude-code Tool<Input, Output> 设计：
 * - 每个工具有明确的输入/输出 schema（Zod）
 * - isConcurrencySafe 决定是否可以与其他工具并行执行
 * - buildTool 工厂函数补全默认值
 */
export interface ToolDef<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: ZodSchema<TInput>;

  /** 是否并发安全（true 时可与其他工具并行） */
  isConcurrencySafe?: boolean | undefined;

  /** 是否只读（不修改外部状态） */
  isReadOnly?: boolean | undefined;

  execute(input: TInput, ctx: AgentContext): Promise<TOutput>;
}

/**
 * buildTool 工厂：补全可选字段默认值，确保类型一致性。
 * 参考 claude-code 的 buildTool 模式。
 */
export function buildTool<TInput, TOutput>(
  def: Omit<ToolDef<TInput, TOutput>, 'isConcurrencySafe' | 'isReadOnly'> &
    Partial<Pick<ToolDef<TInput, TOutput>, 'isConcurrencySafe' | 'isReadOnly'>>
): ToolDef<TInput, TOutput> {
  return {
    isConcurrencySafe: false,
    isReadOnly: false,
    ...def,
  };
}

/** Tool 注册表接口 */
export interface ToolRegistry {
  register(tool: ToolDef): void;
  get(name: string): ToolDef | undefined;
  getAll(): ToolDef[];
  has(name: string): boolean;
}
