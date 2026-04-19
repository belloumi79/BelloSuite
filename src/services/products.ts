import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createProductSchema } from '../app/api/stock/products/route'
import { BusinessError } from '@/lib/errors'

type CreateProductData = z.infer<typeof createProductSchema>

export const getProducts = unstable_cache(
  async (tenantId: string) => {
    return prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  },
  ['products'],
  { revalidate: 300 } // Cache for 5 minutes
)

export async function createProduct(data: CreateProductData) {
  const { tenantId, code, name, description, category, unit, purchasePrice, salePrice, vatRate, fodec, minStock, initialStock, barcode } = data

  // Check for existing code
  const existing = await prisma.product.findUnique({
    where: { tenantId_code: { tenantId, code } },
  })
  if (existing) {
    throw new BusinessError('Code produit déjà utilisé', 409)
  }

  // Create product
  const product = await prisma.product.create({
    data: {
      tenantId,
      code,
      barcode: barcode || null,
      name,
      description: description || null,
      category: category || null,
      unit,
      purchasePrice,
      salePrice,
      vatRate,
      fodec,
      minStock,
      currentStock: initialStock,
    },
  })

  // Create initial stock movement if initialStock > 0
  if (initialStock > 0) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: product.id,
        type: 'ENTRY',
        quantity: initialStock,
        unitPrice: purchasePrice,
        notes: 'Stock initial',
      },
    })
  }

  return product
}