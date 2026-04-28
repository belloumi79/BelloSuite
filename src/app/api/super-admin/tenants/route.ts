import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getTenants, createTenant, createTenantSchema } from '@/services/super-admin'
import { UserRole } from '@prisma/client'

// GET /api/super-admin/tenants
export async function GET(req: NextRequest) {
  try {
    const ctx = getSuperAdminContext(req)
    if (ctx instanceof NextResponse) return ctx

    const tenants = await getTenants(ctx.userRole as UserRole)
    return NextResponse.json(tenants)
  } catch (err) {
    return handleApiError(err, 'GET super-admin tenants')
  }
}

// POST /api/super-admin/tenants
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getSuperAdminContext(req)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createTenantSchema, body)
    if (data instanceof NextResponse) return data

    const tenant = await createTenant(data, ctx.userRole as UserRole)
    return NextResponse.json(tenant, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST super-admin tenant')
  }
}
