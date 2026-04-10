import { nanoid } from 'nanoid';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import type { AuthContext } from './auth.js';

export async function writeAuditLog(params: {
  db: Db;
  auth: AuthContext;
  action: string;
  resource: string;
  status: 'success' | 'denied' | 'error';
  detail?: string;
}) {
  const { db, auth, action, resource, status, detail } = params;
  await db.insert(schema.auditLogs).values({
    id: nanoid(),
    tenantId: auth.tenantId,
    userId: auth.userId,
    role: auth.role,
    action,
    resource,
    status,
    detail: detail ?? null,
    createdAt: new Date(),
  });
}

