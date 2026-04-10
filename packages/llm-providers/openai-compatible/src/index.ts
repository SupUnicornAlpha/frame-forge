import OpenAI from 'openai';
import type {
  CompletionChunk,
  CompletionRequest,
  CompletionResponse,
  LLMMessage,
  LLMProvider,
} from '@frame-forge/core';

export interface OpenAICompatibleProviderConfig {
  providerId: string;
  apiKey: string;
  baseURL: string;
  defaultModels: string[];
  organization?: string | undefined;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly id: string;
  readonly supportedModels: string[];
  private readonly client: OpenAI;

  constructor(config: OpenAICompatibleProviderConfig) {
    this.id = config.providerId;
    this.supportedModels = config.defaultModels;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
    });
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const tools =
      req.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          // 这里只提供一个占位 schema，框架后续可在 ToolDef→OpenAI 参数处做更完整的转换
          parameters: { type: 'object', description: 'Input schema' },
        },
      })) ?? [];

    const response = await this.client.chat.completions.create({
      model: req.model,
      messages: this.toOpenAIMessages(req.messages),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
      ...(tools.length > 0 ? { tools } : {}),
    });

    const choice = response.choices[0];
    if (!choice) throw new Error(`${this.id} returned no choices`);

    const message = choice.message;
    const toolCalls = message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: safeJsonParse(tc.function.arguments),
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
      finishReason: mapFinishReason(choice.finish_reason),
    };
  }

  async *stream(req: CompletionRequest): AsyncIterable<CompletionChunk> {
    const stream = await this.client.chat.completions.create({
      model: req.model,
      messages: this.toOpenAIMessages(req.messages),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      const mappedRole = mapDeltaRole(delta.role);
      yield {
        delta: {
          ...(mappedRole ? { role: mappedRole } : {}),
          ...(typeof delta.content === 'string' ? { content: delta.content } : {}),
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
          role: 'tool',
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
}

function mapDeltaRole(
  role: string | null | undefined
): LLMMessage['role'] | undefined {
  if (role === 'assistant' || role === 'system' || role === 'user' || role === 'tool') return role;
  return undefined;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function mapFinishReason(reason: string | null): CompletionResponse['finishReason'] {
  if (reason === 'tool_calls') return 'tool_calls';
  if (reason === 'length') return 'length';
  if (reason === 'content_filter') return 'error';
  return 'stop';
}
