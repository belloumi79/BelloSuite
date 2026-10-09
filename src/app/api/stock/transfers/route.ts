import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { createTransfer, transferSchema, validateTransfer, cancelTransfer } from '@/services/stock'
import { prisma } from '@/lib/db'
import { TransferStatus } from '@prisma/client'
import { readJson, str } from '@/lib/stock-api'

const STATUSES = Object.values(TransferStatus) as string[]

// GET /api/stock/transfers?status=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ctx = await getApiContext(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const status = searchParams.get('status')

    const transfers = await prisma.stockTransfer.findMany({
      where: { tenantId: ctx.tenantId, ...(status && STATUSES.includes(status) ? { status: status as TransferStatus } : {}) },
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, code: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return NextResponse.json(transfers)
  } catch (err) {
    return handleApiError(err, 'GET stock transfers')
  }
}

// POST /api/stock/transfers  { fromWarehouseId, toWarehouseId, date?, notes?, items: [{ productId, quantity }] } → brouillon
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(transferSchema, body)
    if (data instanceof NextResponse) return data
    const transfer = await createTransfer(ctx.tenantId, data)

    if (body.validate === true) {
      const validated = await validateTransfer(transfer.id, ctx.tenantId, ctx.user.id)
      return NextResponse.json(validated, { status: 201 })
    }
    return NextResponse.json(transfer, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST stock transfer')
  }
}

// PATCH /api/stock/transfers?id=  { status: TRANSFERRED | CANCELLED }  (compatibilité ; préférer /transfers/:id)
export async function PATCH(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx

    if (body.status === TransferStatus.TRANSFERRED) return NextResponse.json(await validateTransfer(id, ctx.tenantId, ctx.user.id))
    if (body.status === TransferStatus.CANCELLED) return NextResponse.json(await cancelTransfer(id, ctx.tenantId))
    return NextResponse.json({ error: 'Statut non supporté' }, { status: 400 })
  } catch (err) {
    return handleApiError(err, 'PATCH stock transfer')
  }
}
