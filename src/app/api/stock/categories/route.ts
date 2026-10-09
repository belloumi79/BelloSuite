import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError, BusinessError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { isStockAdmin, forbidden, readJson, str, categorySchema } from '@/lib/stock-api'

// GET /api/stock/categories → catégories du référentiel + celles déjà utilisées sur les produits
export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const [cats, used] = await Promise.all([
      prisma.productCategory.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: 'asc' } }),
      prisma.product.groupBy({ by: ['category'], where: { tenantId: ctx.tenantId, category: { not: null } }, _count: { _all: true } }),
    ])
    const counts = new Map(used.map(u => [u.category as string, u._count._all]))
    const known = new Set(cats.map(c => c.name))
    const rows = [
      ...cats.map(c => ({ ...c, productCount: counts.get(c.name) ?? 0, managed: true })),
      ...used.filter(u => u.category && !known.has(u.category)).map(u => ({
        id: null, tenantId: ctx.tenantId, name: u.category as string, description: null, productCount: u._count._all, managed: false,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json(rows)
  } catch (err) {
    return handleApiError(err, 'GET categories')
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (!isStockAdmin(ctx)) return forbidden()
    const data = parseBody(categorySchema, body)
    if (data instanceof NextResponse) return data
    const dup = await prisma.productCategory.findFirst({ where: { tenantId: ctx.tenantId, name: data.name }, select: { id: true } })
    if (dup) throw new BusinessError('Catégorie déjà existante', 409)
    const cat = await prisma.productCategory.create({ data: { tenantId: ctx.tenantId, name: data.name, description: data.description || null } })
    return NextResponse.json(cat, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST category')
  }
}
