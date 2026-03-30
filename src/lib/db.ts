import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================
// STOCK HELPERS
// ============================================

export async function createProduct(data: {
  tenantId: string
  code: string
  name: string
  category?: string
  unit?: string
  purchasePrice?: number
  salePrice?: number
}) {
  return prisma.product.create({
    data: {
      ...data,
      purchasePrice: data.purchasePrice ?? 0,
      salePrice: data.salePrice ?? 0,
      unit: data.unit ?? 'unité',
    },
  })
}

export async function recordStockMovement(data: {
  tenantId: string
  productId: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
  quantity: number
  reason?: string
  reference?: string
  createdBy?: string
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: data.productId } })
    if (!product) throw new Error('Produit non trouvé')

    let newStock = product.currentStock
    if (data.type === 'IN') newStock += data.quantity
    else if (data.type === 'OUT') {
      newStock -= data.quantity
      if (newStock < 0) throw new Error('Stock insuffisant')
    } else {
      newStock = data.quantity
    }

    await tx.product.update({
      where: { id: data.productId },
      data: { currentStock: newStock },
    })

    return tx.stockMovement.create({
      data: {
        tenantId: data.tenantId,
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        reference: data.reference,
        createdBy: data.createdBy,
      },
    })
  })
}

export async function getStockAlerts(tenantId: string) {
  return prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      currentStock: { lte: prisma.product.fields.minStock },
    },
    orderBy: { currentStock: 'asc' },
  })
}
