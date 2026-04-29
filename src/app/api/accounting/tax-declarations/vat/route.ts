import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getVATSummary, postVATLiquidationToAccounting } from '@/services/accounting'

// GET /api/accounting/tax-declarations/vat?month=X&year=Y
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    if (!month || !year) {
      return NextResponse.json({ error: 'Mois et année requis' }, { status: 400 })
    }

    const summary = await getVATSummary(Number(month), Number(year), ctx.tenantId)
    return NextResponse.json(summary)
  } catch (err) {
    return handleApiError(err, 'GET vat summary')
  }
}

// POST /api/accounting/tax-declarations/vat
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { month, year, tenantId: bodyTenantId } = body

    const ctx = getApiContext(req, bodyTenantId)
    if (ctx instanceof NextResponse) return ctx

    if (!month || !year) {
      return NextResponse.json({ error: 'Mois et année requis' }, { status: 400 })
    }

    const entry = await postVATLiquidationToAccounting(Number(month), Number(year), ctx.tenantId)
    return NextResponse.json(entry)
  } catch (err) {
    return handleApiError(err, 'POST vat liquidation')
  }
}
