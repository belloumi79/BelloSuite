import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getStockAlerts } from '@/services/stock'

// GET /api/stock/alerts → produits sous le seuil, alertes par dépôt, suggestions « à commander »
export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    return NextResponse.json(await getStockAlerts(ctx.tenantId))
  } catch (err) {
    return handleApiError(err, 'GET stock alerts')
  }
}
