import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getWarehouses, createWarehouse, createWarehouseSchema } from '@/services/stock'
import { isStockAdmin, forbidden, readJson, str } from '@/lib/stock-api'

// GET /api/stock/warehouses?includeArchived=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ctx = await getApiContext(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx

    const warehouses = await getWarehouses(ctx.tenantId, { includeArchived: searchParams.get('includeArchived') === '1' })
    return NextResponse.json(warehouses)
  } catch (err) {
    return handleApiError(err, 'GET warehouses')
  }
}

// POST /api/stock/warehouses
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (!isStockAdmin(ctx)) return forbidden()

    const data = parseBody(createWarehouseSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const warehouse = await createWarehouse({ ...data, tenantId: ctx.tenantId })
    return NextResponse.json(warehouse, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST warehouse')
  }
}
