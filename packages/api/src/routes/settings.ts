import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import { writeAuditLog } from '../security/audit.js';
import { requireRole } from '../security/auth.js';
import { decryptToken, encryptToken, maskToken } from '../security/crypto.js';

const ProviderSecretInputSchema = z.object({
  providerId: z.string().min(1),
  token: z.string().min(1),
});

export async function settingsRoute(fastify: FastifyInstance, options: { db: Db }) {
  const { db } = options;
  const cryptoSecret = process.env.CONFIG_ENCRYPTION_SECRET ?? 'frame-forge-dev-secret';

  fastify.get('/settings/providers', async (request, reply) => {
    const auth = requireRole(request, reply, 'admin');
    if (!auth) return;

    const rows = await db
      .select()
      .from(schema.providerSecrets)
      .where(eq(schema.providerSecrets.tenantId, auth.tenantId));

    const providers = rows.map((row) => {
      const token = decryptToken(row.encryptedToken, cryptoSecret);
      return {
        providerId: row.providerId,
        configured: true,
        maskedToken: maskToken(token),
        updatedAt: row.updatedAt,
      };
    });

    return { providers };
  });

  fastify.put('/settings/providers', async (request, reply) => {
    const auth = requireRole(request, reply, 'admin');
    if (!auth) {
      return;
    }
    const body = ProviderSecretInputSchema.parse(request.body);
    const encryptedToken = encryptToken(body.token, cryptoSecret);
    const now = new Date();

    const existing = await db
      .select()
      .from(schema.providerSecrets)
      .where(
        and(
          eq(schema.providerSecrets.tenantId, auth.tenantId),
          eq(schema.providerSecrets.providerId, body.providerId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(schema.providerSecrets)
        .set({
          encryptedToken,
          updatedBy: auth.userId,
          updatedAt: now,
        })
        .where(eq(schema.providerSecrets.id, existing[0].id));
    } else {
      await db.insert(schema.providerSecrets).values({
        id: `${auth.tenantId}:${body.providerId}`,
        tenantId: auth.tenantId,
        providerId: body.providerId,
        encryptedToken,
        createdBy: auth.userId,
        updatedBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await writeAuditLog({
      db,
      auth,
      action: 'provider.secret.update',
      resource: `provider:${body.providerId}`,
      status: 'success',
    });

    return { ok: true };
  });

  fastify.delete<{ Params: { providerId: string } }>('/settings/providers/:providerId', async (request, reply) => {
    const auth = requireRole(request, reply, 'admin');
    if (!auth) return;

    await db
      .delete(schema.providerSecrets)
      .where(and(eq(schema.providerSecrets.tenantId, auth.tenantId), eq(schema.providerSecrets.providerId, request.params.providerId)));

    await writeAuditLog({
      db,
      auth,
      action: 'provider.secret.delete',
      resource: `provider:${request.params.providerId}`,
      status: 'success',
    });

    return { ok: true };
  });
}

