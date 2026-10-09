import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { readJson, str } from '@/lib/stock-api'
import { getSupplierReturns, createSupplierReturn, supplierReturnSchema } from '@/services/purchase-orders'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    return NextResponse.json(await getSupplierReturns(ctx.tenantId))
  } catch (err) {
    return handleApiError(err, 'GET supplier returns')
  }
}

// POST { receiptId, items: [{ receiptItemId, quantity }] } → sortie de stock (SUPPLIER_RETURN)
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    const data = parseBody(supplierReturnSchema, body)
    if (data instanceof NextResponse) return data
    return NextResponse.json(await createSupplierReturn(ctx.tenantId, data, ctx.user.id), { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST supplier return')
  }
}
