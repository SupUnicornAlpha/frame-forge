import type { LLMProvider } from '@frame-forge/core';
import { OpenAICompatibleProvider } from '@frame-forge/llm-openai-compatible';

export interface DeepSeekProviderConfig {
  apiKey: string;
  baseURL?: string | undefined;
  defaultModels?: string[] | undefined;
}

export class DeepSeekProvider implements LLMProvider {
  readonly id = 'deepseek';
  readonly supportedModels: string[];
  private readonly adapter: OpenAICompatibleProvider;

  constructor(config: DeepSeekProviderConfig) {
    this.supportedModels = config.defaultModels ?? ['deepseek-chat', 'deepseek-reasoner'];
    this.adapter = new OpenAICompatibleProvider({
      providerId: this.id,
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://api.deepseek.com/v1',
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
