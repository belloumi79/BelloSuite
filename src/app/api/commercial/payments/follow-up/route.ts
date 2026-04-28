import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getPaymentFollowUp } from '@/services/treasury'

// GET /api/commercial/payments/follow-up?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = await getPaymentFollowUp(ctx.tenantId)
    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err, 'GET payment follow-up')
  }
}
