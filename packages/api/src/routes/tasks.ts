import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { and, eq, inArray, lte } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import type { InMemoryLLMProviderRegistry, PipelineRunner } from '@frame-forge/core';
import { OpenAIProvider } from '@frame-forge/llm-openai';
import { AnthropicProvider } from '@frame-forge/llm-anthropic';
import { GeminiProvider } from '@frame-forge/llm-gemini';
import { DeepSeekProvider } from '@frame-forge/llm-deepseek';
import { QwenProvider } from '@frame-forge/llm-qwen';
import { GlmProvider } from '@frame-forge/llm-glm';
import { KimiProvider } from '@frame-forge/llm-kimi';
import { writeAuditLog } from '../security/audit.js';
import { requireRole } from '../security/auth.js';
import { decryptToken } from '../security/crypto.js';

interface TasksRouteOptions {
  db: Db;
  pipelineRunner: PipelineRunner;
  llmRegistry: InMemoryLLMProviderRegistry;
}

export const tasksRoute: FastifyPluginAsync<TasksRouteOptions> = async (fastify, opts) => {
  const { db, pipelineRunner, llmRegistry } = opts;
  const cryptoSecret = process.env.CONFIG_ENCRYPTION_SECRET ?? 'frame-forge-dev-secret';

  fastify.post('/tasks', async (request, reply) => {
    const auth = requireRole(request, reply, 'member');
    if (!auth) return;
    const body = request.body as {
      name: string;
      config: {
        genre?: string;
        targetDuration?: number;
        manualTheme?: string;
        llmProviderId?: string;
      };
    };

    const task = {
      id: nanoid(),
      tenantId: auth.tenantId,
      name: body.name,
      status: 'pending' as const,
      config: JSON.stringify(body.config),
      result: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.tasks).values(task);
    await writeAuditLog({
      db,
      auth,
      action: 'task.create',
      resource: `task:${task.id}`,
      status: 'success',
    });

    setImmediate(() => {
      void runTask(task.id, body.config, db, pipelineRunner);
    });

    return reply.code(201).send({ id: task.id, status: 'pending' });
  });

  fastify.get('/tasks', async (request, reply) => {
    const auth = requireRole(request, reply, 'member');
    if (!auth) return;
    const allTasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.tenantId, auth.tenantId))
      .orderBy(schema.tasks.createdAt);
    return reply.send(allTasks);
  });

  fastify.get<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const auth = requireRole(request, reply, 'member');
    if (!auth) return;
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, request.params.id), eq(schema.tasks.tenantId, auth.tenantId)));

    if (!task) return reply.code(404).send({ error: 'Task not found' });

    const steps = await db
      .select()
      .from(schema.taskSteps)
      .where(eq(schema.taskSteps.taskId, request.params.id));

    const artifacts = await db
      .select()
      .from(schema.taskArtifacts)
      .where(eq(schema.taskArtifacts.taskId, request.params.id));

    return reply.send({ ...task, steps, artifacts });
  });

  fastify.get<{ Params: { id: string } }>('/tasks/:id/artifacts', async (request, reply) => {
    const auth = requireRole(request, reply, 'member');
    if (!auth) return;
    const [task] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, request.params.id), eq(schema.tasks.tenantId, auth.tenantId)));
    if (!task) return reply.code(404).send({ error: 'Task not found' });

    const artifacts = await db
      .select()
      .from(schema.taskArtifacts)
      .where(eq(schema.taskArtifacts.taskId, request.params.id));
    return reply.send(artifacts);
  });

  fastify.patch<{ Params: { id: string } }>(
    '/tasks/:id/pause',
    async (request, reply) => {
      const auth = requireRole(request, reply, 'admin');
      if (!auth) return;
      await db
        .update(schema.tasks)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(and(eq(schema.tasks.id, request.params.id), eq(schema.tasks.tenantId, auth.tenantId)));
      await writeAuditLog({
        db,
        auth,
        action: 'task.pause',
        resource: `task:${request.params.id}`,
        status: 'success',
      });
      return reply.send({ status: 'paused' });
    }
  );

  fastify.delete<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const auth = requireRole(request, reply, 'admin');
    if (!auth) return;
    await db
      .delete(schema.tasks)
      .where(and(eq(schema.tasks.id, request.params.id), eq(schema.tasks.tenantId, auth.tenantId)));
    await writeAuditLog({
      db,
      auth,
      action: 'task.delete',
      resource: `task:${request.params.id}`,
      status: 'success',
    });
    return reply.code(204).send();
  });

  fastify.post<{ Params: { id: string } }>(
    '/tasks/:id/chat',
    async (request, reply) => {
      const body = request.body as {
        message: string;
        providerId?: string;
        model?: string;
      };
      const auth = requireRole(request, reply, 'member');
      if (!auth) return;
      const userMessage = body?.message?.trim();
      if (!userMessage) {
        return reply.code(400).send({ error: 'message is required' });
      }

      const [task] = await db
        .select()
        .from(schema.tasks)
        .where(and(eq(schema.tasks.id, request.params.id), eq(schema.tasks.tenantId, auth.tenantId)));
      if (!task) return reply.code(404).send({ error: 'Task not found' });

      const provider = resolveChatProvider({
        registry: llmRegistry,
        providerId: body.providerId,
        apiKey: await getProviderApiKey({
          db,
          tenantId: auth.tenantId,
          providerId: body.providerId ?? 'openai',
          secret: cryptoSecret,
        }),
      });
      if (provider.id === 'mock') {
        return reply.code(400).send({
          error: '当前供应商未配置服务端 token，请先到设置页保存 token。',
        });
      }
      const model = body.model ?? provider.supportedModels[0] ?? 'mock-model';

      const [latestStep] = await db
        .select()
        .from(schema.taskSteps)
        .where(eq(schema.taskSteps.taskId, request.params.id));

      const response = await provider.complete({
        model,
        temperature: 0.4,
        maxTokens: 800,
        messages: [
          {
            role: 'system',
            content:
              '你是 frame-forge 任务协作助手。你需要围绕当前任务状态回答，帮助用户理解进度、风险和下一步动作。回答简洁、可执行。',
          },
          {
            role: 'user',
            content: JSON.stringify(
              {
                task: {
                  id: task.id,
                  name: task.name,
                  status: task.status,
                  config: task.config,
                  result: task.result,
                },
                latestStep: latestStep
                  ? {
                      stepId: latestStep.stepId,
                      agentRole: latestStep.agentRole,
                      status: latestStep.status,
                      iterations: latestStep.iterations,
                    }
                  : null,
                question: userMessage,
              },
              null,
              2
            ),
          },
        ],
      });

      return reply.send({
        reply: typeof response.message.content === 'string' ? response.message.content : '',
        providerId: provider.id,
        model,
      });
    }
  );

  fastify.post('/tasks/retention/cleanup', async (request, reply) => {
    const auth = requireRole(request, reply, 'admin');
    if (!auth) return;
    const body = (request.body ?? {}) as { olderThanDays?: number };
    const olderThanDays = Math.max(1, Math.min(3650, Number(body.olderThanDays ?? 30)));
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.tenantId, auth.tenantId),
          lte(schema.tasks.updatedAt, cutoff),
          inArray(schema.tasks.status, ['completed', 'failed'])
        )
      );
    const ids = candidates.map((c) => c.id);
    if (ids.length === 0) return { deletedTasks: 0, cutoff: cutoff.toISOString() };

    await db.delete(schema.taskSteps).where(inArray(schema.taskSteps.taskId, ids));
    await db.delete(schema.taskArtifacts).where(inArray(schema.taskArtifacts.taskId, ids));
    await db.delete(schema.tasks).where(inArray(schema.tasks.id, ids));

    await writeAuditLog({
      db,
      auth,
      action: 'task.retention.cleanup',
      resource: `tasks:${ids.length}`,
      status: 'success',
      detail: JSON.stringify({ olderThanDays, deleted: ids.length }),
    });
    return { deletedTasks: ids.length, cutoff: cutoff.toISOString() };
  });
};

function resolveChatProvider(params: {
  registry: InMemoryLLMProviderRegistry;
  providerId?: string | undefined;
  apiKey?: string | undefined;
}) {
  const { registry, providerId, apiKey } = params;

  if (!apiKey) {
    return providerId ? registry.get(providerId) : registry.getDefault();
  }

  const id = providerId ?? 'openai';
  if (id === 'openai') return new OpenAIProvider({ apiKey });
  if (id === 'anthropic') return new AnthropicProvider({ apiKey });
  if (id === 'gemini') return new GeminiProvider({ apiKey });
  if (id === 'deepseek') return new DeepSeekProvider({ apiKey });
  if (id === 'qwen') return new QwenProvider({ apiKey });
  if (id === 'glm') return new GlmProvider({ apiKey });
  if (id === 'kimi') return new KimiProvider({ apiKey });

  return registry.get(id);
}

async function getProviderApiKey(params: {
  db: Db;
  tenantId: string;
  providerId: string;
  secret: string;
}): Promise<string | undefined> {
  const rows = await params.db
    .select()
    .from(schema.providerSecrets)
    .where(eq(schema.providerSecrets.id, `${params.tenantId}:${params.providerId}`))
    .limit(1);
  if (!rows[0]) return undefined;
  return decryptToken(rows[0].encryptedToken, params.secret);
}

async function runTask(
  taskId: string,
  config: Record<string, unknown>,
  db: Db,
  pipelineRunner: PipelineRunner
): Promise<void> {
  await db
    .update(schema.tasks)
    .set({ status: 'running', updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId));

  try {
    const { getShortDramaPipeline } = await import('../pipeline/short-drama.js');
    const pipeline = getShortDramaPipeline();
    const result = await pipelineRunner.run(pipeline, config, taskId);

    await db
      .update(schema.tasks)
      .set({
        status: 'completed',
        result: JSON.stringify(result),
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, taskId));
  } catch (err) {
    await db
      .update(schema.tasks)
      .set({
        status: 'failed',
        result: JSON.stringify({ error: (err as Error).message }),
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, taskId));
  }
}
