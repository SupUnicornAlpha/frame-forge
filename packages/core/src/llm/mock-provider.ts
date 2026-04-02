import type {
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  LLMProvider,
} from './types.js';

/**
 * MockLLMProvider：开发和测试用的 LLM Provider。
 *
 * 返回预设的固定响应，不调用真实 API，用于单元测试和本地调试。
 */
export class MockLLMProvider implements LLMProvider {
  readonly id: string;
  readonly supportedModels: string[];
  private readonly fixedResponse: string;

  constructor(id = 'mock', fixedResponse = '{"result": "mock output"}') {
    this.id = id;
    this.supportedModels = ['mock-model'];
    this.fixedResponse = fixedResponse;
  }

  async complete(_req: CompletionRequest): Promise<CompletionResponse> {
    return {
      message: { role: 'assistant', content: this.fixedResponse },
      usage: { inputTokens: 10, outputTokens: 50, totalTokens: 60 },
      finishReason: 'stop',
    };
  }

  async *stream(_req: CompletionRequest): AsyncIterable<CompletionChunk> {
    yield {
      delta: { content: this.fixedResponse },
      finishReason: 'stop',
    };
  }
}
