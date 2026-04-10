import type { FastifyReply, FastifyRequest } from 'fastify';

export type UserRole = 'admin' | 'member' | 'viewer';

export interface AuthContext {
  tenantId: string;
  userId: string;
  role: UserRole;
}

const ROLE_WEIGHT: Record<UserRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
};

export function readAuthContext(req: FastifyRequest): AuthContext {
  const tenantId = String(req.headers['x-tenant-id'] ?? 'default-tenant');
  const userId = String(req.headers['x-user-id'] ?? 'demo-admin');
  const roleRaw = String(req.headers['x-user-role'] ?? 'admin');
  const role: UserRole =
    roleRaw === 'admin' || roleRaw === 'member' || roleRaw === 'viewer'
      ? roleRaw
      : 'viewer';
  return { tenantId, userId, role };
}

export function requireRole(
  req: FastifyRequest,
  reply: FastifyReply,
  requiredRole: UserRole
): AuthContext | null {
  const auth = readAuthContext(req);
  if (ROLE_WEIGHT[auth.role] < ROLE_WEIGHT[requiredRole]) {
    void reply.code(403).send({
      error: 'forbidden',
      requiredRole,
      currentRole: auth.role,
    });
    return null;
  }
  return auth;
}

