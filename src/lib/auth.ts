import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { SessionPayload } from './session'

export async function getCurrentUser(req?: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Get role and tenantId from metadata or fallback to User table
  let role: string = user.user_metadata?.role || 'USER'
  let tenantId: string | null = user.user_metadata?.tenant_id || null

  if (!tenantId || !role) {
    const { data: userRow } = await supabase
      .from('User')
      .select('tenantId, role')
      .eq('email', user.email)
      .maybeSingle()
    if (userRow) {
      tenantId = userRow.tenantId || tenantId
      role = userRow.role || role
    }
  }

  return { id: user.id, email: user.email!, role, tenantId }
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
 * Fast path: read user context from headers injected by the middleware (proxy.ts).
 * Avoids a Supabase round-trip on every authenticated API call.
 * Falls back to null if headers are missing (e.g. during tests or direct calls).
 */
export function getCurrentUserFromHeaders(req: NextRequest): SessionPayload | null {
  const id = req.headers.get('x-user-id')
  const email = req.headers.get('x-user-email')
  const role = req.headers.get('x-user-role')
  const tenantId = req.headers.get('x-tenant-id')
  const firstName = req.headers.get('x-user-firstname') || ''

  if (!id || !email || !role) return null

  return { id, email, role, tenantId: tenantId || null, firstName }
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