import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { validateTransfer } from '@/services/stock'
import { prisma } from '@/lib/db'
import { TransferStatus } from '@prisma/client'

// GET /api/stock/transfers?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const transfers = await prisma.stockTransfer.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        fromWarehouse: { select: { code: true, name: true } },
        toWarehouse: { select: { code: true, name: true } },
        items: { include: { product: { select: { name: true, code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(transfers)
  } catch (err) {
    return handleApiError(err, 'GET stock transfers')
  }
}

// POST /api/stock/transfers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { fromWarehouseId, toWarehouseId, items, notes, date } = body

    if (!fromWarehouseId || !toWarehouseId || !items?.length) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const ref = `TRF-${Date.now()}`
    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId: ctx.tenantId,
        reference: ref,
        date: new Date(date),
        fromWarehouseId,
        toWarehouseId,
        status: TransferStatus.DRAFT,
        notes,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    })
    return NextResponse.json(transfer, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST stock transfer')
  }
}

// PATCH /api/stock/transfers?id=
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { status } = body

    if (status === TransferStatus.TRANSFERRED) {
      const updated = await validateTransfer(id, ctx.tenantId)
      return NextResponse.json(updated)
    }

    const updated = await prisma.stockTransfer.update({
      where: { id, tenantId: ctx.tenantId },
      data: { status },
      include: { items: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    return handleApiError(err, 'PATCH stock transfer')
  }
}