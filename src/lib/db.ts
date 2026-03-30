import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export { prisma, supabase }

export interface StockOperation {
  type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number
  reason?: string
}

export async function executeStockOperation(productId: string, tenantId: string, data: StockOperation) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  })

  if (!product) throw new Error('Produit non trouvé')

  let newStock = Number(product.currentStock)
  const qty = Number(data.quantity)

  if (data.type === 'IN') newStock += qty
  else if (data.type === 'OUT') {
    newStock -= qty
    if (newStock < 0) throw new Error('Stock insuffisant')
  }
  else newStock = qty

  const [updated] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        tenantId,
        productId,
        type: data.type as any,
        quantity: qty,
        notes: data.reason,
      },
    }),
  ])

  return updated
}
