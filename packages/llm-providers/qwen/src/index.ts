import type { LLMProvider } from '@frame-forge/core';
import { OpenAICompatibleProvider } from '@frame-forge/llm-openai-compatible';

export interface QwenProviderConfig {
  apiKey: string;
  baseURL?: string | undefined;
  defaultModels?: string[] | undefined;
}

export class QwenProvider implements LLMProvider {
  readonly id = 'qwen';
  readonly supportedModels: string[];
  private readonly adapter: OpenAICompatibleProvider;

  constructor(config: QwenProviderConfig) {
    this.supportedModels = config.defaultModels ?? ['qwen-plus', 'qwen-turbo', 'qwen-max'];
    this.adapter = new OpenAICompatibleProvider({
      providerId: this.id,
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModels: this.supportedModels,
    });
  }

  complete(...args: Parameters<LLMProvider['complete']>) {
    return this.adapter.complete(...args);
  }

  stream(...args: Parameters<LLMProvider['stream']>) {
    return this.adapter.stream(...args);
  }
}
