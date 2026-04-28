import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getPayrollSummary } from '@/services/hr'

// GET /api/hr/payroll?tenantId=&month=&year=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const month = parseInt(searchParams.get('month') || '')
    const year = parseInt(searchParams.get('year') || '')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Mois et année requis' }, { status: 400 })
    }

    const summary = await getPayrollSummary(ctx.tenantId, month, year)
    return NextResponse.json(summary)
  } catch (err) {
    return handleApiError(err, 'GET payroll summary')
  }
}