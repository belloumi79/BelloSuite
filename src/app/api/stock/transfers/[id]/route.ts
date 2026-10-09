import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { transferSchema, updateTransfer, validateTransfer, cancelTransfer, deleteTransfer } from '@/services/stock'
import { readJson, str } from '@/lib/stock-api'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, code: true, unit: true } } } },
      },
    })
    if (!transfer) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(transfer)
  } catch (err) {
    return handleApiError(err, 'GET stock transfer')
  }
}

// PUT : modifier un brouillon
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    const data = parseBody(transferSchema, body)
    if (data instanceof NextResponse) return data
    return NextResponse.json(await updateTransfer(ctx.tenantId, id, data))
  } catch (err) {
    return handleApiError(err, 'PUT stock transfer')
  }
}

// PATCH { action: 'validate' | 'cancel' }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (body.action === 'validate') return NextResponse.json(await validateTransfer(id, ctx.tenantId, ctx.user.id))
    if (body.action === 'cancel') return NextResponse.json(await cancelTransfer(id, ctx.tenantId))
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    return handleApiError(err, 'PATCH stock transfer')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    return NextResponse.json(await deleteTransfer(id, ctx.tenantId))
  } catch (err) {
    return handleApiError(err, 'DELETE stock transfer')
  }
}
