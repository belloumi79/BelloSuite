import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getWarehouses, createWarehouse, createWarehouseSchema } from '@/services/stock'

// GET /api/stock/warehouses?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const warehouses = await getWarehouses(ctx.tenantId)
    return NextResponse.json(warehouses)
  } catch (err) {
    return handleApiError(err, 'GET warehouses')
  }
}

// POST /api/stock/warehouses
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createWarehouseSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const warehouse = await createWarehouse(data)
    return NextResponse.json(warehouse, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST warehouse')
  }
}