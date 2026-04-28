import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { createStockMovement, createStockMovementSchema } from '@/services/stock'
import { prisma } from '@/lib/db'

// GET /api/stock/movements?tenantId=&productId=&warehouseId=&type=&limit=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const movements = await prisma.stockMovement.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(type ? { type: type as any } : {}),
      },
      include: {
        product: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(movements)
  } catch (err) {
    return handleApiError(err, 'GET stock movements')
  }
}

// POST /api/stock/movements
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createStockMovementSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const movement = await createStockMovement(data)
    return NextResponse.json(movement, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST stock movement')
  }
}
