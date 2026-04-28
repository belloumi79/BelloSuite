import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { StockMovementType, InventoryStatus } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  tenantId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
})

export type CreateWarehouseData = z.infer<typeof createWarehouseSchema>

export const createStockMovementSchema = z.object({
  tenantId: z.string().min(1),
  productId: z.string().min(1),
  warehouseId: z.string().optional().nullable(),
  type: z.nativeEnum(StockMovementType),
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number().optional().default(0),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type CreateStockMovementData = z.infer<typeof createStockMovementSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getWarehouses(tenantId: string) {
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId, isActive: true },
    include: {
      productStock: {
        include: { product: { select: { id: true, name: true, code: true, salePrice: true } } },
      },
    },
    orderBy: { isDefault: 'desc' },
  })

  return warehouses.map(w => ({
    ...w,
    totalProducts: w.productStock.length,
    totalValue: w.productStock.reduce((sum, pw) => sum + Number(pw.stock) * Number(pw.product.salePrice), 0),
  }))
}

export async function createWarehouse(data: CreateWarehouseData) {
  const { tenantId, isDefault } = data

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.warehouse.updateMany({ 
        where: { tenantId, isDefault: true }, 
        data: { isDefault: false } 
      })
    }

    return tx.warehouse.create({
      data,
    })
  })
}

export async function createStockMovement(data: CreateStockMovementData) {
  const { tenantId, productId, warehouseId, type, quantity } = data

  return prisma.$transaction(async (tx) => {
    // 1. Record the movement
    const movement = await tx.stockMovement.create({
      data: {
        ...data,
        warehouseId: warehouseId || null,
      },
    })

    // 2. Update global product stock
    // ENTRY adds, EXIT removes, ADJUSTMENT adds the variance
    const adjustment = type === StockMovementType.EXIT ? -quantity : quantity
    await tx.product.update({
      where: { id: productId },
      data: { currentStock: { increment: adjustment } },
    })

    // 3. Update warehouse specific stock if applicable
    if (warehouseId) {
      await tx.productWarehouse.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        update: { stock: { increment: adjustment } },
        create: { productId, warehouseId, stock: adjustment },
      })
    }

    return movement
  })
}

export async function validateInventory(id: string, tenantId: string, warehouseIdOverride?: string) {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!inventory || inventory.tenantId !== tenantId) {
    throw new BusinessError('Inventaire introuvable', 404)
  }

  if (inventory.status === InventoryStatus.VALIDATED) {
    throw new BusinessError('Cet inventaire est déjà validé', 400)
  }

  const warehouseId = warehouseIdOverride ?? inventory.warehouseId
  if (!warehouseId) {
    throw new BusinessError('Aucun entrepôt associé à cet inventaire', 400)
  }

  return prisma.$transaction(async (tx) => {
    for (const item of inventory.items) {
      // 1. Sync physical stock in warehouse
      await tx.productWarehouse.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId } },
        update: { stock: item.actualQty },
        create: { productId: item.productId, warehouseId, stock: item.actualQty },
      })

      // 2. Record adjustment movement
      if (Number(item.variance) !== 0) {
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId,
            type: StockMovementType.ADJUSTMENT,
            quantity: item.variance,
            reference: inventory.reference,
            notes: `Inventaire ${inventory.reference} : ajustement physique`,
          },
        })

        // 3. Update global product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.variance } },
        })
      }
    }

    // 4. Mark inventory as validated
    return tx.inventory.update({
      where: { id },
      data: { status: InventoryStatus.VALIDATED, warehouseId },
      include: { items: { include: { product: { select: { name: true, code: true } } } } },
    })
  })
}

export async function validateTransfer(id: string, tenantId: string) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!transfer || transfer.tenantId !== tenantId) {
    throw new BusinessError('Transfert introuvable', 404)
  }

  if (transfer.status === 'TRANSFERRED' as any) {
    throw new BusinessError('Ce transfert est déjà validé', 400)
  }

  return prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      // 1. Decrement source warehouse
      await tx.productWarehouse.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: transfer.fromWarehouseId } },
        update: { stock: { decrement: item.quantity } },
        create: { productId: item.productId, warehouseId: transfer.fromWarehouseId, stock: -Number(item.quantity) },
      })

      // 2. Increment destination warehouse
      await tx.productWarehouse.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: transfer.toWarehouseId } },
        update: { stock: { increment: item.quantity } },
        create: { productId: item.productId, warehouseId: transfer.toWarehouseId, stock: item.quantity },
      })

      // 3. Create stock movements for audit trail
      await tx.stockMovement.create({
        data: {
          tenantId: transfer.tenantId,
          productId: item.productId,
          warehouseId: transfer.fromWarehouseId,
          type: StockMovementType.TRANSFER,
          quantity: item.quantity,
          reference: transfer.reference,
          notes: `Transfert vers ${transfer.toWarehouseId}`,
        },
      })

      await tx.stockMovement.create({
        data: {
          tenantId: transfer.tenantId,
          productId: item.productId,
          warehouseId: transfer.toWarehouseId,
          type: StockMovementType.ENTRY,
          quantity: item.quantity,
          reference: transfer.reference,
          notes: `Réception de transfert depuis ${transfer.fromWarehouseId}`,
        },
      })
    }

    // 4. Update global product stock is NOT needed for transfers (it stays the same total)
    // UNLESS it's inter-company, but here it's inter-warehouse within same tenant.

    return tx.stockTransfer.update({
      where: { id },
      data: { status: 'TRANSFERRED' as any },
      include: { items: { include: { product: { select: { name: true, code: true } } } } },
    })
  })
}
