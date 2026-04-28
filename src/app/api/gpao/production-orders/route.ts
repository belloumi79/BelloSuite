import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getProductionOrders, createProductionOrder, createProductionOrderSchema } from '@/services/operations'

// GET /api/gpao/production-orders?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const orders = await getProductionOrders(ctx.tenantId)
    return NextResponse.json(orders)
  } catch (err) {
    return handleApiError(err, 'GET production orders')
  }
}

// POST /api/gpao/production-orders
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createProductionOrderSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const order = await createProductionOrder(data)
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST production order')
  }
}
