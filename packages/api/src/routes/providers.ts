import type { FastifyPluginAsync } from 'fastify';
import type { InMemoryLLMProviderRegistry, InMemoryMediaProviderRegistry } from '@frame-forge/core';

interface ProvidersRouteOptions {
  llmRegistry: InMemoryLLMProviderRegistry;
  mediaRegistry: InMemoryMediaProviderRegistry;
}

export const providersRoute: FastifyPluginAsync<ProvidersRouteOptions> = async (
  fastify,
  opts
) => {
  const { llmRegistry, mediaRegistry } = opts;

  fastify.get('/providers', async (_req, reply) => {
    const llmProviders = llmRegistry.listAll().map((p) => ({
      id: p.id,
      type: 'llm',
      supportedModels: p.supportedModels,
    }));

    return reply.send({ llm: llmProviders });
  });

  fastify.get('/agents', async (_req, reply) => {
    return reply.send({
      message: 'Use GET /providers for provider info',
    });
  });
};
