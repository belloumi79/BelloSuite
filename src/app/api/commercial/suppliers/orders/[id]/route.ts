import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { readJson, str, isStockAdmin, forbidden } from '@/lib/stock-api'
import { getPurchaseOrderDetail, updatePurchaseStatus, deletePurchaseDraft } from '@/services/purchase-orders'

type Params = { params: Promise<{ id: string }> }

// GET : détail (lignes, reçu / restant, réceptions, factures liées, rapprochement)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const doc = await getPurchaseOrderDetail(ctx.tenantId, id)
    if (!doc) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(doc)
  } catch (err) {
    return handleApiError(err, 'GET purchase order')
  }
}

// PATCH { action: 'confirm' | 'cancel' | 'validate' | 'pay' } — l'annulation est réservée aux administrateurs
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    const action = str(body.action)
    if (!action || !['confirm', 'cancel', 'validate', 'pay'].includes(action)) return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    if (action === 'cancel' && !isStockAdmin(ctx)) return forbidden()
    return NextResponse.json(await updatePurchaseStatus(ctx.tenantId, id, action))
  } catch (err) {
    return handleApiError(err, 'PATCH purchase order')
  }
}

// DELETE : brouillon sans pièce liée uniquement
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    return NextResponse.json(await deletePurchaseDraft(ctx.tenantId, id))
  } catch (err) {
    return handleApiError(err, 'DELETE purchase order')
  }
}
