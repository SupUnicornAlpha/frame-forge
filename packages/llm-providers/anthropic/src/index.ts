import Anthropic from '@anthropic-ai/sdk';
import type {
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  LLMProvider,
  LLMMessage,
} from '@frame-forge/core';

export interface AnthropicProviderConfig {
  apiKey: string;
  baseURL?: string | undefined;
  defaultModels?: string[] | undefined;
}

/**
 * Anthropic Claude LLM Provider。
 *
 * 实现 @frame-forge/core 的 LLMProvider 接口，对接 Anthropic API。
 * 支持 Claude 3.5 Sonnet、Claude 3 Haiku 等模型。
 */
export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic';
  readonly supportedModels: string[];

  private readonly client: Anthropic;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.supportedModels = config.defaultModels ?? [
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-opus-latest',
    ];
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const { systemMessage, userMessages } = this.splitMessages(req.messages);

    const tools: Anthropic.Tool[] = (req.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object' as const,
        properties: {},
        description: 'Input schema',
      },
    }));

    const response = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      system: systemMessage,
      messages: userMessages,
      temperature: req.temperature,
      tools: tools.length > 0 ? tools : undefined,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    );

    const toolCalls =
      toolUseBlocks.length > 0
        ? toolUseBlocks.map((b) => ({
            id: b.id,
            name: b.name,
            arguments: b.input,
          }))
        : undefined;

    return {
      message: {
        role: 'assistant',
        content: textBlocks.map((b) => b.text).join('\n'),
        toolCalls,
      },
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: this.mapStopReason(response.stop_reason),
    };
  }

  async *stream(req: CompletionRequest): AsyncIterable<CompletionChunk> {
    const { systemMessage, userMessages } = this.splitMessages(req.messages);

    const stream = await this.client.messages.stream({
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      system: systemMessage,
      messages: userMessages,
      temperature: req.temperature,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          delta: { content: event.delta.text },
        };
      }
    }

    const final = await stream.finalMessage();
    yield {
      delta: {},
      usage: {
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        totalTokens: final.usage.input_tokens + final.usage.output_tokens,
      },
      finishReason: final.stop_reason ?? 'stop',
    };
  }

  private splitMessages(messages: LLMMessage[]): {
    systemMessage: string;
    userMessages: Anthropic.MessageParam[];
  } {
    const systemParts: string[] = [];
    const userMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        userMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        });
      } else if (msg.role === 'tool') {
        userMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId ?? '',
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            },
          ],
        });
      }
    }

    return { systemMessage: systemParts.join('\n'), userMessages };
  }

  private mapStopReason(reason: string | null): CompletionResponse['finishReason'] {
    if (reason === 'tool_use') return 'tool_calls';
    if (reason === 'max_tokens') return 'length';
    return 'stop';
  }
}
