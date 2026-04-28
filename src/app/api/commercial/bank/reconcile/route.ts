import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getReconciliationData, reconcile, reconcileSchema } from '@/services/bank'

// GET /api/commercial/bank/reconcile?tenantId=&bankAccountId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const bankAccountId = searchParams.get('bankAccountId') ?? undefined

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = await getReconciliationData(ctx.tenantId, bankAccountId)
    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err, 'GET reconciliation data')
  }
}

// POST /api/commercial/bank/reconcile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(reconcileSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const result = await reconcile(data)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST reconciliation')
  }
}
