import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { nanoid } from 'nanoid';
import { getDb } from './db/index.js';
import { createContainer } from './plugins/container.js';
import { WsGateway } from './gateway/ws-gateway.js';
import { tasksRoute } from './routes/tasks.js';
import { providersRoute } from './routes/providers.js';
import { settingsRoute } from './routes/settings.js';
import { auditRoute } from './routes/audit.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const DB_PATH = process.env['DB_PATH'] ?? './frame-forge.db';

async function start() {
  const logLevel = process.env['LOG_LEVEL'] ?? 'info';
  const usePretty = process.env['LOG_PRETTY'] === 'true';
  const enableLogger = process.env['ENABLE_LOGGER'] === 'true';
  const fastify = Fastify({
    logger: enableLogger
      ? usePretty
        ? {
            level: logLevel,
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          }
        : { level: logLevel }
      : false,
  });

  await fastify.register(fastifyCors, { origin: true });
  await fastify.register(fastifyWebsocket);

  const db = getDb(DB_PATH);
  const container = createContainer();
  const wsGateway = new WsGateway(container.eventBus);

  await fastify.register(tasksRoute, {
    db,
    pipelineRunner: container.pipelineRunner,
    llmRegistry: container.llmRegistry,
  });

  await fastify.register(providersRoute, {
    llmRegistry: container.llmRegistry,
    mediaRegistry: container.mediaRegistry,
  });

  await fastify.register(settingsRoute, { db });
  await fastify.register(auditRoute, { db });

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
    await fastify.listen({ port: PORT, host: process.env['HOST'] ?? '127.0.0.1' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

void start();
