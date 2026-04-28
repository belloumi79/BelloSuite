import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'

// ─── Zod Schemas ────────────────────────────────────────────

export const purchaseOrderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, 'description requise'),
  quantity: z.coerce.number().positive('quantité doit être positive'),
  unitPrice: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
})

export const createPurchaseOrderSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  supplierId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(), // If linked to a client request
  number: z.string().min(1, 'numéro requis'),
  type: z.string().default('ORDER'),
  date: z.string().optional(),
  expectedDate: z.string().optional().nullable(),
  subtotal: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'au moins un article requis'),
})

export type CreatePurchaseOrderData = z.infer<typeof createPurchaseOrderSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getPurchaseOrders(tenantId: string, status?: string) {
  return prisma.purchaseOrder.findMany({
    where: {
      tenantId,
      ...(status && status !== 'TOUT' ? { status } : {}),
    },
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      client: { select: { id: true, name: true } },
      items: true,
    },
    orderBy: { date: 'desc' },
  })
}

export async function createPurchaseOrder(data: CreatePurchaseOrderData) {
  const { tenantId, supplierId, clientId, number, type, date, expectedDate, subtotal, taxAmount, total, notes, items } = data

  // Check duplicate number
  const existing = await prisma.purchaseOrder.findFirst({
    where: { tenantId, number },
    select: { id: true },
  })
  if (existing) {
    throw new BusinessError(`Bon de commande "${number}" déjà utilisé`, 409)
  }

  return prisma.$transaction(async (tx) => {
    return tx.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: supplierId || null,
        clientId: clientId || null,
        number,
        type,
        status: 'PENDING',
        date: date ? new Date(date) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        taxAmount,
        total,
        notes: notes ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId ?? null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      include: { supplier: true, items: true },
    })
  })
}
