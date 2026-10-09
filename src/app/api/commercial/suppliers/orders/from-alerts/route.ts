import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { readJson, str } from '@/lib/stock-api'
import { createPoFromAlerts, poFromAlertsSchema } from '@/services/purchase-orders'

// POST { supplierId, warehouseId?, items?: [{ productId, quantity }] } → bon de commande brouillon
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    const data = parseBody(poFromAlertsSchema, body)
    if (data instanceof NextResponse) return data
    return NextResponse.json(await createPoFromAlerts(ctx.tenantId, data), { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST purchase order from alerts')
  }
}
