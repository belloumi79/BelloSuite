import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { createInventory, createInventorySchema, validateInventory, cancelInventory } from '@/services/stock'
import { prisma } from '@/lib/db'
import { InventoryStatus } from '@prisma/client'
import { inventorySummary } from '@/lib/stock-logic'
import { isStockAdmin, forbidden, readJson, str } from '@/lib/stock-api'

const STATUSES = Object.values(InventoryStatus) as string[]

// GET /api/stock/inventory?status=&warehouseId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ctx = await getApiContext(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const status = searchParams.get('status')
    const warehouseId = searchParams.get('warehouseId')

    const inventories = await prisma.inventory.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(status && STATUSES.includes(status) ? { status: status as InventoryStatus } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        items: { select: { expectedQty: true, actualQty: true, counted: true, unitCost: true, productId: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    })
    return NextResponse.json(inventories.map(({ items, ...inv }) => ({
      ...inv,
      summary: inventorySummary(items.map(i => ({
        productId: i.productId, expectedQty: Number(i.expectedQty), actualQty: Number(i.actualQty), counted: i.counted, unitCost: Number(i.unitCost ?? 0),
      }))),
    })))
  } catch (err) {
    return handleApiError(err, 'GET inventories')
  }
}

// POST /api/stock/inventory { warehouseId, scope: FULL|CATEGORY, category?, date?, notes? } → session + photo du stock théorique
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    const data = parseBody(createInventorySchema, body)
    if (data instanceof NextResponse) return data
    const inventory = await createInventory(ctx.tenantId, data)
    return NextResponse.json(inventory, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST inventory')
  }
}

// PATCH /api/stock/inventory?id=  { status: VALIDATED | CANCELLED }  (compatibilité ; préférer /inventory/:id)
export async function PATCH(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (body.status === InventoryStatus.VALIDATED) {
      if (!isStockAdmin(ctx)) return forbidden()
      return NextResponse.json(await validateInventory(id, ctx.tenantId, { userId: ctx.user.id }))
    }
    if (body.status === InventoryStatus.CANCELLED) return NextResponse.json(await cancelInventory(id, ctx.tenantId))
    return NextResponse.json({ error: 'Statut non supporté' }, { status: 400 })
  } catch (err) {
    return handleApiError(err, 'PATCH inventory')
  }
}
