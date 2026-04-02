import type { LLMProvider } from '@frame-forge/core';
import { OpenAICompatibleProvider } from '@frame-forge/llm-openai-compatible';

export interface KimiProviderConfig {
  apiKey: string;
  baseURL?: string | undefined;
  defaultModels?: string[] | undefined;
}

export class KimiProvider implements LLMProvider {
  readonly id = 'kimi';
  readonly supportedModels: string[];
  private readonly adapter: OpenAICompatibleProvider;

  constructor(config: KimiProviderConfig) {
    this.supportedModels = config.defaultModels ?? ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'];
    this.adapter = new OpenAICompatibleProvider({
      providerId: this.id,
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://api.moonshot.cn/v1',
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
