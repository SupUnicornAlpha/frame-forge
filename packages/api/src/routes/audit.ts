import { and, desc, eq, lte } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import { requireRole } from '../security/auth.js';

interface AuditRouteOptions {
  db: Db;
}

export const auditRoute: FastifyPluginAsync<AuditRouteOptions> = async (fastify, opts) => {
  const { db } = opts;

  fastify.get('/audit/logs', async (request, reply) => {
    const auth = requireRole(request, reply, 'admin');
    if (!auth) return;
    const query = (request.query ?? {}) as {
      limit?: number | string;
      offset?: number | string;
      action?: string;
      status?: 'success' | 'denied' | 'error';
    };
    const limit = Math.max(1, Math.min(500, Number(query.limit ?? 200)));
    const offset = Math.max(0, Number(query.offset ?? 0));
    const conditions = [eq(schema.auditLogs.tenantId, auth.tenantId)];
    if (query.action) conditions.push(eq(schema.auditLogs.action, query.action));
    if (query.status) conditions.push(eq(schema.auditLogs.status, query.status));

    const logs = await db
      .select()
      .from(schema.auditLogs)
      .where(and(...conditions))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
    return { logs, pagination: { limit, offset } };
  });

  fastify.post('/audit/logs/retention/cleanup', async (request, reply) => {
    const auth = requireRole(request, reply, 'admin');
    if (!auth) return;
    const body = (request.body ?? {}) as { olderThanDays?: number };
    const olderThanDays = Math.max(1, Math.min(3650, Number(body.olderThanDays ?? 180)));
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const candidates = await db
      .select({ id: schema.auditLogs.id })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.tenantId, auth.tenantId), lte(schema.auditLogs.createdAt, cutoff)));
    if (candidates.length > 0) {
      await db.delete(schema.auditLogs).where(
        and(eq(schema.auditLogs.tenantId, auth.tenantId), lte(schema.auditLogs.createdAt, cutoff))
      );
    }
    return { ok: true, olderThanDays, cutoff: cutoff.toISOString(), deleted: candidates.length };
  });
};

