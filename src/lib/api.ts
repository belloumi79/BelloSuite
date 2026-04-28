/**
 * Centralized API request context helper.
 * Reads user/tenant info injected by the middleware (proxy.ts) into request headers.
 * Use this in all API routes instead of calling getCurrentUser() to avoid Supabase round-trips.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromHeaders, assertTenantAccess } from './auth'
import { handleApiError, BusinessError } from './errors'
import type { SessionPayload } from './session'

export type ApiContext = {
  user: SessionPayload
  tenantId: string
  userRole: string
}

export type SuperAdminContext = {
  user: SessionPayload
  userRole: string
}

/**
 * Extracts and validates user + tenantId from a request.
 * Returns `{ user, tenantId }` or a NextResponse error to return immediately.
 *
 * Usage:
 * ```ts
 * const ctx = getApiContext(req, searchParams.get('tenantId'))
 * if (ctx instanceof NextResponse) return ctx
 * const { user, tenantId } = ctx
 * ```
 */
export function getApiContext(
  req: NextRequest,
  tenantId: string | null
): ApiContext | NextResponse {
  const user = getCurrentUserFromHeaders(req)

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (!tenantId || tenantId === 'null' || tenantId === 'undefined') {
    return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })
  }

  try {
    assertTenantAccess(user, tenantId)
  } catch {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  return { 
    user, 
    tenantId,
    userRole: user.role
  }
}

/**
 * Specialized context for Super Admin routes that don't require a tenantId.
 */
export function getSuperAdminContext(req: NextRequest): SuperAdminContext | NextResponse {
  const user = getCurrentUserFromHeaders(req)

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès réservé au Super Admin' }, { status: 403 })
  }

  return { 
    user, 
    userRole: user.role
  }
}

/**
 * Validates a request body with a Zod schema and returns either parsed data or a 400 response.
 *
 * Usage:
 * ```ts
 * const data = parseBody(schema, body)
 * if (data instanceof NextResponse) return data
 * ```
 */
import { z } from 'zod'

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> | NextResponse {
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: result.error.issues },
      { status: 400 }
    )
  }
  return result.data
}

export { handleApiError, BusinessError }
