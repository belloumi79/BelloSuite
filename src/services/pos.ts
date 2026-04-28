import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { POSSessionStatus, POSOrderStatus, PaymentMethod, POSType } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const openSessionSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  openingCash: z.number().min(0),
})

export const posOrderSchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  orderNumber: z.string().min(1),
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().optional().nullable(),
    productCode: z.string().optional().nullable(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPriceHT: z.number(),
    vatRate: z.number().default(19),
    discount: z.number().default(0),
  })).min(1),
  payments: z.array(z.object({
    method: z.nativeEnum(PaymentMethod),
    amount: z.number().positive(),
    reference: z.string().optional().nullable(),
  })).min(1),
  discountPercent: z.number().default(0),
  notes: z.string().optional().nullable(),
})

export type OpenSessionData = z.infer<typeof openSessionSchema>
export type POSOrderData = z.infer<typeof posOrderSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getSessions(tenantId: string) {
  return prisma.pOSSession.findMany({
    where: { tenantId },
    include: { _count: { select: { orders: true } } },
    orderBy: { openedAt: 'desc' },
  })
}

export async function openSession(data: OpenSessionData) {
  return prisma.$transaction(async (tx) => {
    // 1. Create session
    const session = await tx.pOSSession.create({
      data: {
        ...data,
        status: POSSessionStatus.OPEN,
      }
    })

    // 2. Update cash drawer
    await tx.cashDrawer.upsert({
      where: { tenantId: data.tenantId },
      update: { balance: { increment: data.openingCash } },
      create: { tenantId: data.tenantId, balance: data.openingCash }
    })

    return session
  })
}

export async function createPOSOrder(data: POSOrderData) {
  return prisma.$transaction(async (tx) => {
    // 1. Calculate totals
    let subtotalHT = 0
    let totalVAT = 0
    
    const itemsData = data.items.map(item => {
      const lineHT = item.quantity * item.unitPriceHT
      const lineVAT = lineHT * (item.vatRate / 100)
      subtotalHT += lineHT
      totalVAT += lineVAT
      
      return {
        ...item,
        totalHT: lineHT,
        totalTTC: lineHT + lineVAT,
        vatAmount: lineVAT
      }
    })

    const totalTTC = subtotalHT + totalVAT + 1.000 // + Timbre Fiscal
    const paidAmount = data.payments.reduce((acc, p) => acc + p.amount, 0)

    // 2. Create Order
    const order = await tx.pOSOrder.create({
      data: {
        tenantId: data.tenantId,
        sessionId: data.sessionId,
        orderNumber: data.orderNumber,
        clientId: data.clientId,
        clientName: data.clientName,
        subtotalHT,
        totalVAT,
        totalTTC,
        paidAmount,
        isPaid: paidAmount >= totalTTC,
        discountPercent: data.discountPercent,
        notes: data.notes,
        items: { createMany: { data: itemsData } },
        payments: { 
          createMany: { 
            data: data.payments.map(p => ({ ...p, tenantId: data.tenantId })) 
          } 
        }
      }
    })

    // 3. Update Stocks
    for (const item of data.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } }
        })

        await tx.stockMovement.create({
          data: {
            tenantId: data.tenantId,
            productId: item.productId,
            type: 'EXIT',
            quantity: item.quantity,
            notes: `Vente POS #${data.orderNumber}`,
            reference: order.id
          }
        })
      }
    }

    // 4. Update Cash Drawer if cash payment
    const cashTotal = data.payments
      .filter(p => p.method === PaymentMethod.CASH)
      .reduce((acc, p) => acc + p.amount, 0)

    if (cashTotal > 0) {
      await tx.cashDrawer.update({
        where: { tenantId: data.tenantId },
        data: { balance: { increment: cashTotal } }
      })
    }

    return order
  })
}
