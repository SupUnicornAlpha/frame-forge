import type { ToolDef } from '../tool/types.js';
import type { TokenUsage } from '../agent/types.js';

/** LLM 消息（对齐 OpenAI / Anthropic 格式） */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | LLMMessageContent[];
  toolCallId?: string | undefined;
  toolCalls?: LLMToolCall[] | undefined;
}

export type LLMMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; url: string }
  | { type: 'image_base64'; data: string; mimeType: string };

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface CompletionRequest {
  messages: LLMMessage[];
  model: string;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  tools?: ToolDef[] | undefined;
  stream?: boolean | undefined;
}

export interface CompletionResponse {
  message: LLMMessage;
  usage: TokenUsage;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface CompletionChunk {
  delta: Partial<LLMMessage>;
  usage?: TokenUsage | undefined;
  finishReason?: string | undefined;
}

/**
 * LLM Provider 接口。
 *
 * 参考 OpenClaw ModelProviderConfig + pi-ai Api 抽象：
 * 每个供应商实现 complete（非流式）和 stream（流式），
 * 通过 LLMProviderRegistry 注册后由 AgentRunner 按 providerId 选用。
 */
export interface LLMProvider {
  readonly id: string;
  readonly supportedModels: string[];

  complete(req: CompletionRequest): Promise<CompletionResponse>;
  stream(req: CompletionRequest): AsyncIterable<CompletionChunk>;
}

/** Agent 内引用的 LLM 配置 */
export interface LLMConfig {
  providerId: string;
  model: string;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
}

/** LLM Provider 注册表 */
export interface LLMProviderRegistry {
  register(provider: LLMProvider): void;
  get(id: string): LLMProvider;
  getDefault(): LLMProvider;
  setDefault(id: string): void;
  listAll(): LLMProvider[];
}
