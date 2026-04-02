import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { nanoid } from 'nanoid';
import { getDb } from './db/index.js';
import { createContainer } from './plugins/container.js';
import { WsGateway } from './gateway/ws-gateway.js';
import { tasksRoute } from './routes/tasks.js';
import { providersRoute } from './routes/providers.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const DB_PATH = process.env['DB_PATH'] ?? './frame-forge.db';

async function start() {
  const fastify = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  await fastify.register(fastifyCors, { origin: true });
  await fastify.register(fastifyWebsocket);

  const db = getDb(DB_PATH);
  const container = createContainer();
  const wsGateway = new WsGateway(container.eventBus);

  await fastify.register(tasksRoute, {
    db,
    pipelineRunner: container.pipelineRunner,
  });

  await fastify.register(providersRoute, {
    llmRegistry: container.llmRegistry,
    mediaRegistry: container.mediaRegistry,
  });

  fastify.get('/ws', { websocket: true }, (socket) => {
    const connectionId = nanoid();
    wsGateway.addConnection(connectionId, socket);
  });

  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  fastify.addHook('onClose', () => {
    wsGateway.destroy();
    return container.commandQueue.drain();
  });

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

void start();
