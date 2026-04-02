import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  LLMProvider,
} from '@frame-forge/core';

export interface GeminiProviderConfig {
  apiKey: string;
  defaultModels?: string[] | undefined;
}

/**
 * Google Gemini LLM Provider。
 *
 * 实现 @frame-forge/core 的 LLMProvider 接口，对接 Google Generative AI API。
 */
export class GeminiProvider implements LLMProvider {
  readonly id = 'gemini';
  readonly supportedModels: string[];

  private readonly client: GoogleGenerativeAI;

  constructor(config: GeminiProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.supportedModels = config.defaultModels ?? [
      'gemini-2.0-flash',
      'gemini-2.0-pro',
      'gemini-1.5-flash',
    ];
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = this.client.getGenerativeModel({ model: req.model });

    const systemInstruction = req.messages.find((m) => m.role === 'system')?.content;
    const chatMessages = req.messages.filter((m) => m.role !== 'system');

    const chat = model.startChat({
      systemInstruction:
        typeof systemInstruction === 'string' ? systemInstruction : undefined,
      history: chatMessages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      })),
    });

    const lastMessage = chatMessages[chatMessages.length - 1];
    const userContent =
      lastMessage
        ? typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content)
        : '';

    const result = await chat.sendMessage(userContent);
    const response = await result.response;

    return {
      message: {
        role: 'assistant',
        content: response.text(),
      },
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
      finishReason: 'stop',
    };
  }

  async *stream(req: CompletionRequest): AsyncIterable<CompletionChunk> {
    const model = this.client.getGenerativeModel({ model: req.model });
    const lastMessage = req.messages[req.messages.length - 1];
    const content =
      lastMessage
        ? typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content)
        : '';

    const result = await model.generateContentStream(content);

    for await (const chunk of result.stream) {
      yield {
        delta: { content: chunk.text() },
      };
    }
  }
}
