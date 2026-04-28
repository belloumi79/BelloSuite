import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getGeneralLedger } from '@/services/accounting'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const accountId = searchParams.get('accountId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const ledger = await getGeneralLedger(ctx.tenantId, { startDate, endDate, accountId })
    return NextResponse.json(ledger)
  } catch (err) {
    return handleApiError(err, 'GET general ledger')
  }
}