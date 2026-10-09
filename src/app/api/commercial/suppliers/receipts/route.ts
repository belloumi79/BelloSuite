import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { readJson, str, isStockAdmin } from '@/lib/stock-api'
import { getReceipts, createReceipt, receiptSchema } from '@/services/purchase-orders'

// GET ?status=&purchaseOrderId=
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams
    const ctx = await getApiContext(req, sp.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    return NextResponse.json(await getReceipts(ctx.tenantId, { status: sp.get('status'), purchaseOrderId: sp.get('purchaseOrderId') }))
  } catch (err) {
    return handleApiError(err, 'GET goods receipts')
  }
}

// POST : bon de réception (depuis une commande ou direct) ; validate=true → entrée en stock immédiate
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    const data = parseBody(receiptSchema, body)
    if (data instanceof NextResponse) return data
    const receipt = await createReceipt(ctx.tenantId, data, { userId: ctx.user.id, isAdmin: isStockAdmin(ctx) })
    return NextResponse.json(receipt, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST goods receipt')
  }
}
