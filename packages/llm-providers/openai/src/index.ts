import type { LLMProvider } from '@frame-forge/core';
import {
  OpenAICompatibleProvider,
  type OpenAICompatibleProviderConfig,
} from '@frame-forge/llm-openai-compatible';

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
  private readonly adapter: OpenAICompatibleProvider;

  constructor(config: OpenAIProviderConfig) {
    const adapterConfig: OpenAICompatibleProviderConfig = {
      providerId: 'openai',
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://api.openai.com/v1',
      organization: config.organization,
      defaultModels: config.defaultModels ?? ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'],
    };
    this.adapter = new OpenAICompatibleProvider(adapterConfig);
    this.supportedModels = adapterConfig.defaultModels;
  }

  async complete(...args: Parameters<LLMProvider['complete']>) {
    return this.adapter.complete(...args);
  }

  stream(...args: Parameters<LLMProvider['stream']>) {
    return this.adapter.stream(...args);
  }
}
