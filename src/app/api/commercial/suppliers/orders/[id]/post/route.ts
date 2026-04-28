import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { postPurchaseToAccounting } from '@/services/accounting'

// POST /api/commercial/suppliers/orders/[id]/post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const entry = await postPurchaseToAccounting(id, ctx.tenantId)
    return NextResponse.json(entry)
  } catch (err) {
    return handleApiError(err, 'POST purchase order post to accounting')
  }
}
