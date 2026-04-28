import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { postPaymentToAccounting } from '@/services/accounting'

// POST /api/commercial/invoices/[id]/pay
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { method } = body // 'CASH' | 'BANK'
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const entry = await postPaymentToAccounting(id, ctx.tenantId, method || 'BANK')
    return NextResponse.json(entry)
  } catch (err) {
    return handleApiError(err, 'POST invoice payment')
  }
}
