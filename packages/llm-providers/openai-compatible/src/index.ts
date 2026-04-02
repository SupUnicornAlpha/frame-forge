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
          parameters: { type: 'object', description: 'Input schema' },
        },
      })),
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
