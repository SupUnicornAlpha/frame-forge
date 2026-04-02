import type { LLMProvider } from '@frame-forge/core';
import { OpenAICompatibleProvider } from '@frame-forge/llm-openai-compatible';

export interface GlmProviderConfig {
  apiKey: string;
  baseURL?: string | undefined;
  defaultModels?: string[] | undefined;
}

export class GlmProvider implements LLMProvider {
  readonly id = 'glm';
  readonly supportedModels: string[];
  private readonly adapter: OpenAICompatibleProvider;

  constructor(config: GlmProviderConfig) {
    this.supportedModels = config.defaultModels ?? ['glm-4-plus', 'glm-4-air', 'glm-4-flash'];
    this.adapter = new OpenAICompatibleProvider({
      providerId: this.id,
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://open.bigmodel.cn/api/paas/v4',
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
