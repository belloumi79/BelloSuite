import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getStockValuation } from '@/services/stock'
import { assertBelongsToTenant } from '@/lib/tenant-scope'

// GET /api/stock/valuation?warehouseId= → valorisation au CMUP par produit et par dépôt
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ctx = await getApiContext(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const warehouseId = searchParams.get('warehouseId')
    await assertBelongsToTenant('warehouse', warehouseId, ctx.tenantId)
    return NextResponse.json(await getStockValuation(ctx.tenantId, warehouseId))
  } catch (err) {
    return handleApiError(err, 'GET stock valuation')
  }
}
