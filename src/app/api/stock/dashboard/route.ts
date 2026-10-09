import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getStockDashboard } from '@/services/stock'

// GET /api/stock/dashboard → KPI, dépôts valorisés, stock bas, derniers mouvements
export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    return NextResponse.json(await getStockDashboard(ctx.tenantId))
  } catch (err) {
    return handleApiError(err, 'GET stock dashboard')
  }
}
