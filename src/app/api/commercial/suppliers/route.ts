import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getSuppliers, createSupplier, createSupplierSchema } from '@/services/suppliers'

// GET /api/commercial/suppliers?tenantId=&activeOnly=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const activeOnly = searchParams.get('activeOnly') === 'true'
    const suppliers = await getSuppliers(ctx.tenantId, activeOnly)
    return NextResponse.json(suppliers)
  } catch (err) {
    return handleApiError(err, 'GET suppliers')
  }
}

// POST /api/commercial/suppliers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createSupplierSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const supplier = await createSupplier(data)
    return NextResponse.json(supplier, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST supplier')
  }
}
