import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { readJson, str, isStockAdmin } from '@/lib/stock-api'
import { getReceipt, validateReceipt, cancelReceipt } from '@/services/purchase-orders'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const r = await getReceipt(ctx.tenantId, id)
    if (!r) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(r)
  } catch (err) {
    return handleApiError(err, 'GET goods receipt')
  }
}

// PATCH { action: 'validate' | 'cancel' } (annulation : brouillon uniquement)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (body.action === 'validate') return NextResponse.json(await validateReceipt(ctx.tenantId, id, ctx.user.id, isStockAdmin(ctx)))
    if (body.action === 'cancel') return NextResponse.json(await cancelReceipt(ctx.tenantId, id))
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    return handleApiError(err, 'PATCH goods receipt')
  }
}
