import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { postPayrollToAccounting } from '@/services/accounting'

// POST /api/hr/payroll/post
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { month, year, tenantId: bodyTenantId } = body

    const ctx = getApiContext(req, bodyTenantId)
    if (ctx instanceof NextResponse) return ctx

    if (!month || !year) {
      return NextResponse.json({ error: 'Mois et année requis' }, { status: 400 })
    }

    const entry = await postPayrollToAccounting(Number(month), Number(year), ctx.tenantId)
    return NextResponse.json(entry)
  } catch (err) {
    return handleApiError(err, 'POST payroll post to accounting')
  }
}
