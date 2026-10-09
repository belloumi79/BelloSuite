import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { inventoryCountsSchema, saveInventoryCounts, validateInventory, cancelInventory } from '@/services/stock'
import { inventorySummary } from '@/lib/stock-logic'
import { isStockAdmin, forbidden, readJson, str } from '@/lib/stock-api'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const inv = await prisma.inventory.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        warehouse: { select: { id: true, code: true, name: true, address: true } },
        items: {
          include: { product: { select: { id: true, code: true, barcode: true, name: true, category: true, unit: true } } },
          orderBy: { product: { code: 'asc' } },
        },
      },
    })
    if (!inv) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const summary = inventorySummary(inv.items.map(i => ({
      productId: i.productId, expectedQty: Number(i.expectedQty), actualQty: Number(i.actualQty), counted: i.counted, unitCost: Number(i.unitCost ?? 0),
    })))
    return NextResponse.json({ ...inv, summary })
  } catch (err) {
    return handleApiError(err, 'GET inventory')
  }
}

// PUT { counts: [{ itemId, actualQty | null, notes? }] } → saisie des quantités comptées
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    const data = parseBody(inventoryCountsSchema, body)
    if (data instanceof NextResponse) return data
    return NextResponse.json(await saveInventoryCounts(ctx.tenantId, id, data.counts))
  } catch (err) {
    return handleApiError(err, 'PUT inventory counts')
  }
}

// PATCH { action: 'validate' | 'cancel', uncountedAsZero? }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (body.action === 'validate') {
      if (!isStockAdmin(ctx)) return forbidden()
      return NextResponse.json(await validateInventory(id, ctx.tenantId, { uncountedAsZero: body.uncountedAsZero === true, userId: ctx.user.id }))
    }
    if (body.action === 'cancel') return NextResponse.json(await cancelInventory(id, ctx.tenantId))
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    return handleApiError(err, 'PATCH inventory')
  }
}
