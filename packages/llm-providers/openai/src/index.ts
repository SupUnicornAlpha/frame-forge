import OpenAI from 'openai';
import type {
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  LLMProvider,
  LLMMessage,
} from '@frame-forge/core';

export interface OpenAIProviderConfig {
  apiKey: string;
  baseURL?: string | undefined;
  organization?: string | undefined;
  defaultModels?: string[] | undefined;
}

/**
 * OpenAI LLM Provider。
 *
 * 实现 @frame-forge/core 的 LLMProvider 接口，对接 OpenAI API。
 * 支持 GPT-4o、o1 等模型。
 */
export class OpenAIProvider implements LLMProvider {
  readonly id = 'openai';
  readonly supportedModels: string[];

  private readonly client: OpenAI;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
    });
    this.supportedModels = config.defaultModels ?? ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'];
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: req.model,
      messages: this.toOpenAIMessages(req.messages),
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      tools: req.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: zodToJsonSchema(t.inputSchema),
        },
      })),
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('OpenAI returned no choices');

    const message = choice.message;
    const toolCalls = message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as unknown,
    }));

    return {
      message: {
        role: 'assistant',
        content: message.content ?? '',
        toolCalls,
      },
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }

  async *stream(req: CompletionRequest): AsyncIterable<CompletionChunk> {
    const stream = await this.client.chat.completions.create({
      model: req.model,
      messages: this.toOpenAIMessages(req.messages),
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      yield {
        delta: {
          role: delta.role ?? undefined,
          content: delta.content ?? undefined,
        },
        finishReason: chunk.choices[0]?.finish_reason ?? undefined,
      };
    }
  }

  private toOpenAIMessages(
    messages: LLMMessage[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: m.toolCallId ?? '',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        };
      }

      return {
        role: m.role as 'system' | 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
    });
  }

  private mapFinishReason(
    reason: string | null
  ): CompletionResponse['finishReason'] {
    if (reason === 'tool_calls') return 'tool_calls';
    if (reason === 'length') return 'length';
    return 'stop';
  }
}

/** 简单的 Zod schema → JSON schema 转换（仅支持基础类型） */
function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  const zod = schema as { _def?: { typeName?: string } };
  if (!zod?._def) return { type: 'object' };
  return { type: 'object', description: 'Input schema' };
}
