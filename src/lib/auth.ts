import { NextRequest } from 'next/server'
import { SessionPayload, getSession } from './session'

/**
 * Utilisateur courant, lu depuis la session signée `bello_session`.
 * Le rôle et le tenant de la session proviennent de la table `User` (Prisma) au moment du login :
 * on ne lit plus JAMAIS `user_metadata` (modifiable par l'utilisateur) ni la table User via la clé anon.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCurrentUser(_req?: NextRequest) {
  const session = await getSession()
  if (!session) return null
  return { id: session.id, email: session.email, role: session.role, tenantId: session.tenantId }
}

export enum Permission {
  CREATE_PRODUCT = 'CREATE_PRODUCT',
  READ_PRODUCT = 'READ_PRODUCT',
  UPDATE_PRODUCT = 'UPDATE_PRODUCT',
  DELETE_PRODUCT = 'DELETE_PRODUCT',
  // Add more as needed
}

const rolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),
  ADMIN: [Permission.READ_PRODUCT, Permission.CREATE_PRODUCT, Permission.UPDATE_PRODUCT],
  USER: [Permission.READ_PRODUCT],
}

export function hasPermission(role: string, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function requirePermission(role: string, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/**
 * Guard: throws a BusinessError if the user is not allowed to access the given tenantId.
 * SUPER_ADMIN can access any tenant.
 */
export function assertTenantAccess(user: SessionPayload, tenantId: string): void {
  if (user.role === 'SUPER_ADMIN') return
  if (user.tenantId !== tenantId) {
    throw new Error('Forbidden: tenant mismatch')
  }
}