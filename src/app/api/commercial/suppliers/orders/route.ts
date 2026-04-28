import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getPurchaseOrders, createPurchaseOrder, createPurchaseOrderSchema } from '@/services/purchase-orders'

// GET /api/commercial/suppliers/orders?tenantId=&status=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status') ?? undefined

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const orders = await getPurchaseOrders(ctx.tenantId, status)
    return NextResponse.json(orders)
  } catch (err) {
    return handleApiError(err, 'GET purchase orders')
  }
}

// POST /api/commercial/suppliers/orders
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createPurchaseOrderSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const order = await createPurchaseOrder(data)
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST purchase order')
  }
}