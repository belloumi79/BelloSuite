import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { validateInventory } from '@/services/stock'
import { prisma } from '@/lib/db'
import { InventoryStatus } from '@prisma/client'

// GET /api/stock/inventory?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const inventories = await prisma.inventory.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        warehouse: { select: { code: true, name: true } },
        items: { include: { product: { select: { name: true, code: true } } } },
      },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(inventories)
  } catch (err) {
    return handleApiError(err, 'GET inventories')
  }
}

// POST /api/stock/inventory
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { warehouseId, reference, date, items, notes } = body

    if (!reference || !items?.length) {
      return NextResponse.json({ error: 'Référence et articles requis' }, { status: 400 })
    }

    const inventory = await prisma.inventory.create({
      data: {
        tenantId: ctx.tenantId,
        warehouseId,
        reference,
        date: new Date(date),
        notes,
        status: InventoryStatus.DRAFT,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            expectedQty: i.expectedQty,
            actualQty: i.actualQty,
            unitCost: i.unitCost,
            variance: Number(i.actualQty) - Number(i.expectedQty),
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    })
    return NextResponse.json(inventory, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST inventory')
  }
}

// PATCH /api/stock/inventory?id=
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { status, warehouseId } = body

    if (status === InventoryStatus.VALIDATED) {
      const updated = await validateInventory(id, ctx.tenantId, warehouseId)
      return NextResponse.json(updated)
    }

    const updated = await prisma.inventory.update({
      where: { id, tenantId: ctx.tenantId },
      data: { status, warehouseId },
      include: { items: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    return handleApiError(err, 'PATCH inventory')
  }
}