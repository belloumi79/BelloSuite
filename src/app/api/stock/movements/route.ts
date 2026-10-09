import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { createStockMovement, createStockMovementSchema } from '@/services/stock'
import { prisma } from '@/lib/db'
import { Prisma, StockMovementType } from '@prisma/client'
import { readJson, str } from '@/lib/stock-api'

const TYPES = Object.values(StockMovementType) as string[]

function parseDate(v: string | null, endOfDay = false): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null
  const d = new Date(v.length === 10 ? `${v}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}` : v)
  return Number.isNaN(d.getTime()) ? null : d
}

// GET /api/stock/movements?productId=&warehouseId=&type=&from=YYYY-MM-DD&to=YYYY-MM-DD&q=&page=&pageSize=&limit=
// Sans `page` : renvoie un tableau (compatibilité). Avec `page` : { items, total, page, pageSize }.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ctx = await getApiContext(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx

    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const type = searchParams.get('type')
    const from = parseDate(searchParams.get('from'))
    const to = parseDate(searchParams.get('to'), true)
    const q = searchParams.get('q')?.trim()

    const where: Prisma.StockMovementWhereInput = {
      tenantId: ctx.tenantId,
      ...(productId ? { productId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(type && TYPES.includes(type) ? { type: type as StockMovementType } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(q ? { OR: [
        { reference: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { product: { code: { contains: q, mode: 'insensitive' } } },
      ] } : {}),
    }
    const include = {
      product: { select: { id: true, name: true, code: true, unit: true } },
      warehouse: { select: { id: true, name: true, code: true } },
    }

    const pageParam = searchParams.get('page')
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1)
      const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50') || 50))
      const [items, total] = await Promise.all([
        prisma.stockMovement.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.stockMovement.count({ where }),
      ])
      return NextResponse.json({ items, total, page, pageSize })
    }

    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const movements = await prisma.stockMovement.findMany({ where, include, orderBy: { createdAt: 'desc' }, take: limit })
    return NextResponse.json(movements)
  } catch (err) {
    return handleApiError(err, 'GET stock movements')
  }
}

// POST /api/stock/movements  { productId, warehouseId, type: ENTRY|EXIT|ADJUSTMENT, quantity, unitPrice?, reference?, reason?, notes? }
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createStockMovementSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const movement = await createStockMovement({ ...data, tenantId: ctx.tenantId }, ctx.user.id)
    return NextResponse.json(movement, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST stock movement')
  }
}
