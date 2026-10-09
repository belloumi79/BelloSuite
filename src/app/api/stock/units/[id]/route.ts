import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError, BusinessError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { isStockAdmin, forbidden, readJson, str, unitSchema } from '@/lib/stock-api'

type Params = { params: Promise<{ id: string }> }

// PUT : nom et décimales (le code, référencé par les produits, n'est pas modifiable)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (!isStockAdmin(ctx)) return forbidden()
    const unit = await prisma.stockUnit.findFirst({ where: { id, tenantId: ctx.tenantId } })
    if (!unit) throw new BusinessError('Unité introuvable', 404)
    const data = parseBody(unitSchema, { ...body, code: unit.code })
    if (data instanceof NextResponse) return data
    return NextResponse.json(await prisma.stockUnit.update({ where: { id }, data: { name: data.name, decimals: data.decimals } }))
  } catch (err) {
    return handleApiError(err, 'PUT unit')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    if (!isStockAdmin(ctx)) return forbidden()
    const unit = await prisma.stockUnit.findFirst({ where: { id, tenantId: ctx.tenantId } })
    if (!unit) throw new BusinessError('Unité introuvable', 404)
    const used = await prisma.product.count({ where: { tenantId: ctx.tenantId, unit: unit.code } })
    if (used > 0) throw new BusinessError('IN_USE', 409)
    await prisma.stockUnit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, 'DELETE unit')
  }
}
