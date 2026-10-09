import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError, BusinessError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { isStockAdmin, forbidden, readJson, str, categorySchema } from '@/lib/stock-api'

type Params = { params: Promise<{ id: string }> }

// PUT : renommer (les produits de la catégorie suivent)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (!isStockAdmin(ctx)) return forbidden()
    const data = parseBody(categorySchema, body)
    if (data instanceof NextResponse) return data
    const cat = await prisma.productCategory.findFirst({ where: { id, tenantId: ctx.tenantId } })
    if (!cat) throw new BusinessError('Catégorie introuvable', 404)
    if (data.name !== cat.name) {
      const dup = await prisma.productCategory.findFirst({ where: { tenantId: ctx.tenantId, name: data.name, NOT: { id } }, select: { id: true } })
      if (dup) throw new BusinessError('Catégorie déjà existante', 409)
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (data.name !== cat.name) {
        await tx.product.updateMany({ where: { tenantId: ctx.tenantId, category: cat.name }, data: { category: data.name } })
      }
      return tx.productCategory.update({ where: { id }, data: { name: data.name, description: data.description || null } })
    })
    return NextResponse.json(updated)
  } catch (err) {
    return handleApiError(err, 'PUT category')
  }
}

// DELETE : interdit si des produits l'utilisent
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    if (!isStockAdmin(ctx)) return forbidden()
    const cat = await prisma.productCategory.findFirst({ where: { id, tenantId: ctx.tenantId } })
    if (!cat) throw new BusinessError('Catégorie introuvable', 404)
    const used = await prisma.product.count({ where: { tenantId: ctx.tenantId, category: cat.name } })
    if (used > 0) throw new BusinessError('IN_USE', 409)
    await prisma.productCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, 'DELETE category')
  }
}
