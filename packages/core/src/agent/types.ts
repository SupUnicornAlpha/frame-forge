import type { ZodSchema } from 'zod';
import type { ToolDef } from '../tool/types.js';
import type { LLMConfig } from '../llm/types.js';

/**
 * Agent 角色标识。内置角色用字面量类型约束，自定义角色用 string 扩展。
 */
export type AgentRole =
  | 'scheduler'
  | 'trend-scout'
  | 'screenwriter'
  | 'critic'
  | 'storyboard'
  | 'video-director'
  | 'audience'
  | (string & Record<never, never>);

/** Agent 运行时上下文 */
export interface AgentContext {
  taskId: string;
  agentId: string;
  role: AgentRole;
  parentContext?: AgentContext;
  sessionHistory: AgentMessage[];
  metadata: Record<string, unknown>;
}

/** Agent 内部消息格式 */
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string | undefined;
  toolCalls?: AgentToolCall[] | undefined;
  timestamp: Date;
}

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

/** Agent 生命周期钩子 */
/**
 * Agent 生命周期钩子。
 *
 * 这里刻意使用 `unknown`，避免 `exactOptionalPropertyTypes + 严格函数参数方差`
 * 下，注册不同 TInput/TOutput 的 AgentDef 时出现类型无法赋值的问题。
 */
export interface AgentHooks {
  beforeRun?: (ctx: AgentContext, input: unknown) => Promise<void>;
  afterRun?: (ctx: AgentContext, output: unknown) => Promise<void>;
  onError?: (ctx: AgentContext, error: Error) => Promise<void>;
  onTurn?: (ctx: AgentContext, turn: number) => Promise<void>;
}

/**
 * Agent 声明式定义。
 *
 * 设计参考 claude-code 的 AgentDef 模式：声明式配置，与运行时解耦。
 * 通过 AgentRegistry 注册后，可被 AgentRunner 动态调用。
 */
export interface AgentDef<TInput = unknown, TOutput = unknown> {
  id: string;
  role: AgentRole;
  version?: string | undefined;
  description?: string | undefined;

  /** 系统提示词；支持函数动态生成（在运行时拿到 ctx） */
  systemPrompt: string | ((ctx: AgentContext) => string);

  /** 该 Agent 可使用的工具列表 */
  tools: ToolDef[];

  /** LLM 配置（指向哪个 provider + 哪个 model） */
  llmConfig: LLMConfig;

  /** 最大对话轮次（防止无限循环） */
  maxTurns?: number | undefined;

  /** 输入/输出 Zod Schema，用于运行时验证 */
  inputSchema?: ZodSchema<TInput> | undefined;
  outputSchema?: ZodSchema<TOutput> | undefined;

  /** 能力标签，供 Scheduler Agent 动态发现 */
  capabilities?: string[] | undefined;

  /** 生命周期钩子 */
  hooks?: AgentHooks | undefined;
}

/** Agent 单次运行结果 */
export interface AgentRunResult<TOutput = unknown> {
  output: TOutput;
  sessionHistory: AgentMessage[];
  usage: TokenUsage;
  durationMs: number;
  iterations?: number | undefined;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
