import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createProductSchema } from '@/lib/stock-api'
import { BusinessError } from '@/lib/errors'
import { StockMovementType } from '@prisma/client'
import { applyMovementTx, getDefaultWarehouseId } from '@/services/stock'
import { assertBelongsToTenant } from '@/lib/tenant-scope'

type CreateProductData = z.infer<typeof createProductSchema>

/**
 * Liste des produits du tenant, avec le stock par dépôt.
 * (Plus de cache : le stock change à chaque mouvement et doit être lu à jour.)
 */
export async function getProducts(tenantId: string) {
  return prisma.product.findMany({
    where: { tenantId },
    include: { warehouseStock: { select: { warehouseId: true, stock: true, minStock: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function createProduct(data: CreateProductData, userId?: string | null) {
  const { tenantId, code, name, description, category, unit, purchasePrice, salePrice, vatRate, fodec, minStock, reorderPoint, reorderQty, initialStock, barcode } = data

  const existing = await prisma.product.findUnique({
    where: { tenantId_code: { tenantId, code } },
  })
  if (existing) {
    throw new BusinessError('Code produit déjà utilisé', 409)
  }

  let warehouseId: string | null = null
  if (initialStock > 0) {
    await assertBelongsToTenant('warehouse', data.warehouseId, tenantId)
    warehouseId = data.warehouseId || (await getDefaultWarehouseId(tenantId))
  }

  // Transaction : création du produit + mouvement d'entrée initial (le stock ne bouge que par mouvement)
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        tenantId,
        code,
        barcode: barcode || null,
        name,
        description: description || null,
        category: category || null,
        unit,
        purchasePrice,
        averageCost: purchasePrice,
        salePrice,
        vatRate,
        fodec,
        minStock,
        reorderPoint,
        reorderQty,
        currentStock: 0,
      },
    })

    if (initialStock > 0) {
      await applyMovementTx(tx, {
        tenantId,
        productId: product.id,
        warehouseId,
        type: StockMovementType.ENTRY,
        quantity: initialStock,
        unitCost: purchasePrice,
        reason: 'OPENING',
        notes: 'Stock initial',
        sourceType: 'OPENING',
        createdById: userId ?? null,
        allowNegative: true,
      })
    }

    return tx.product.findUnique({ where: { id: product.id } })
  })
}
