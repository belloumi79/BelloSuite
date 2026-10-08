/**
 * Centralized API request context helper.
 * SÉCURITÉ : l'identité est lue dans le cookie de session signé (voir lib/api-auth.ts),
 * plus jamais dans des en-têtes x-user-* / x-tenant-id envoyables par le client.
 */
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, BusinessError } from './errors'
import { requireTenant, requireSuperAdmin, type TenantContext } from './api-auth'
import type { SessionPayload } from './session'

export type ApiContext = TenantContext

export type SuperAdminContext = {
  user: SessionPayload
  userRole: string
}

/**
 * Session + tenant. Le tenantId passé (query/body) est seulement comparé à celui de la session.
 * ```ts
 * const ctx = await getApiContext(req, searchParams.get('tenantId'))
 * if (ctx instanceof NextResponse) return ctx
 * ```
 */
export async function getApiContext(
  req: NextRequest,
  tenantId?: string | null
): Promise<ApiContext | NextResponse> {
  return requireTenant(req, tenantId)
}

/** Routes réservées au SUPER_ADMIN (rôle vérifié depuis la session signée). */
export async function getSuperAdminContext(req: NextRequest): Promise<SuperAdminContext | NextResponse> {
  const session = await requireSuperAdmin(req)
  if (session instanceof NextResponse) return session
  return { user: session, userRole: session.role }
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
