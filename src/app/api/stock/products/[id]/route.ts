import { requireTenant } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, BusinessError } from '@/lib/errors'
import { allBelongToTenant } from '@/lib/tenant-scope'

type Params = { params: Promise<{ id: string }> }

const numOrUndef = (v: unknown): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const ctx = await requireTenant(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx

    const product = await prisma.product.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { warehouse: { select: { id: true, code: true, name: true } } },
        },
        warehouseStock: { include: { warehouse: { select: { id: true, code: true, name: true, isActive: true } } } },
      },
    })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch (error) {
    return handleApiError(error, 'GET product')
  }
}

/**
 * Mise à jour de la fiche. Le stock (currentStock) n'est JAMAIS modifiable ici : il ne change que via un mouvement.
 * `warehouseMinStock: [{ warehouseId, minStock | null }]` règle les seuils d'alerte par dépôt.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      tenantId: requestedTenantId, code, barcode, name, description, category,
      unit, fodec, images, variants, isActive,
    } = body
    const ctx = await requireTenant(req, requestedTenantId)
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    const current = await prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (code) {
      const existing = await prisma.product.findFirst({ where: { tenantId, code, NOT: { id } } })
      if (existing) return NextResponse.json({ error: 'Code déjà utilisé' }, { status: 409 })
    }

    const whMin: Array<{ warehouseId: string; minStock: unknown }> = Array.isArray(body.warehouseMinStock) ? body.warehouseMinStock : []
    if (whMin.length && !(await allBelongToTenant('warehouse', whMin.map(w => w.warehouseId), tenantId))) {
      throw new BusinessError('Référence invalide (warehouse)', 400)
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id, tenantId },
        data: {
          code, barcode, name, description, category, unit, fodec, images, variants, isActive,
          purchasePrice: numOrUndef(body.purchasePrice),
          salePrice: numOrUndef(body.salePrice),
          vatRate: numOrUndef(body.vatRate),
          minStock: numOrUndef(body.minStock),
          reorderPoint: numOrUndef(body.reorderPoint),
          reorderQty: numOrUndef(body.reorderQty),
        },
      })
      for (const w of whMin) {
        const min = w.minStock === null || w.minStock === '' ? null : numOrUndef(w.minStock)
        if (min === undefined) continue
        await tx.productWarehouse.upsert({
          where: { productId_warehouseId: { productId: id, warehouseId: w.warehouseId } },
          update: { minStock: min },
          create: { productId: id, warehouseId: w.warehouseId, stock: 0, minStock: min },
        })
      }
      return p
    })
    return NextResponse.json(product)
  } catch (error) {
    return handleApiError(error, 'PUT product')
  }
}

/** Suppression uniquement sans historique ; sinon 409 (désactiver le produit à la place). */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const ctx = await requireTenant(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    const product = await prisma.product.findFirst({ where: { id, tenantId }, select: { id: true, currentStock: true } })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const [movements, invItems, trItems] = await Promise.all([
      prisma.stockMovement.count({ where: { productId: id } }),
      prisma.inventoryItem.count({ where: { productId: id } }),
      prisma.stockTransferItem.count({ where: { productId: id } }),
    ])
    if (movements + invItems + trItems > 0 || Number(product.currentStock) !== 0) {
      throw new BusinessError('Produit avec historique de stock : désactivez-le au lieu de le supprimer', 409)
    }
    await prisma.product.delete({ where: { id, tenantId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE product')
  }
}
