import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import type { PipelineRunner } from '@frame-forge/core';

interface TasksRouteOptions {
  db: Db;
  pipelineRunner: PipelineRunner;
}

export const tasksRoute: FastifyPluginAsync<TasksRouteOptions> = async (fastify, opts) => {
  const { db, pipelineRunner } = opts;

  fastify.post('/tasks', async (request, reply) => {
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
      name: body.name,
      status: 'pending' as const,
      config: JSON.stringify(body.config),
      result: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.tasks).values(task);

    setImmediate(() => {
      void runTask(task.id, body.config, db, pipelineRunner);
    });

    return reply.code(201).send({ id: task.id, status: 'pending' });
  });

  fastify.get('/tasks', async (_request, reply) => {
    const allTasks = await db.select().from(schema.tasks).orderBy(schema.tasks.createdAt);
    return reply.send(allTasks);
  });

  fastify.get<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, request.params.id));

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
    const artifacts = await db
      .select()
      .from(schema.taskArtifacts)
      .where(eq(schema.taskArtifacts.taskId, request.params.id));
    return reply.send(artifacts);
  });

  fastify.patch<{ Params: { id: string } }>(
    '/tasks/:id/pause',
    async (request, reply) => {
      await db
        .update(schema.tasks)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(schema.tasks.id, request.params.id));
      return reply.send({ status: 'paused' });
    }
  );

  fastify.delete<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, request.params.id));
    return reply.code(204).send();
  });
};

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
