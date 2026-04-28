import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getTrialBalance } from '@/services/accounting'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const balance = await getTrialBalance(ctx.tenantId, { startDate, endDate })
    return NextResponse.json(balance)
  } catch (err) {
    return handleApiError(err, 'GET trial balance')
  }
}