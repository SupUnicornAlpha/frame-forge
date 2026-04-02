import type { LLMProvider, LLMProviderRegistry } from './types.js';

export class InMemoryLLMProviderRegistry implements LLMProviderRegistry {
  private readonly providers = new Map<string, LLMProvider>();
  private defaultProviderId: string | null = null;

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
    if (this.defaultProviderId === null) {
      this.defaultProviderId = provider.id;
    }
  }

  get(id: string): LLMProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(
        `LLM provider "${id}" not found. Registered providers: ${[...this.providers.keys()].join(', ')}`
      );
    }
    return provider;
  }

  getDefault(): LLMProvider {
    if (!this.defaultProviderId) {
      throw new Error('No LLM providers registered');
    }
    return this.get(this.defaultProviderId);
  }

  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot set default: provider "${id}" not found`);
    }
    this.defaultProviderId = id;
  }

  listAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }
}
