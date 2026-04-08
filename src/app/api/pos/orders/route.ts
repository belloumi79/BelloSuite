import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/pos/orders - List POS orders
// POST /api/pos/orders - Create new POS order
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  const where: any = { tenantId }
  if (sessionId) where.sessionId = sessionId

  const orders = await prisma.pOSOrder.findMany({
    where,
    include: {
      items: true,
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      tenantId,
      sessionId,
      userId,
      userName,
      clientId,
      clientName,
      items,
      paymentMethod = 'CASH',
      paidAmount,
      discountPercent = 0,
      notes,
    } = body

    if (!tenantId || !sessionId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate totals
    let subtotalHT = 0
    let totalVAT = 0

    const orderItems = items.map((item: any) => {
      const totalHT = item.quantity * item.unitPriceHT
      const vatAmount = totalHT * (item.vatRate / 100)
      const itemTotalTTC = totalHT + vatAmount

      subtotalHT += totalHT
      totalVAT += vatAmount

      return {
        productId: item.productId || null,
        productCode: item.productCode || null,
        description: item.description,
        quantity: item.quantity,
        unitPriceHT: item.unitPriceHT,
        vatRate: item.vatRate || 19,
        vatAmount,
        discount: item.discount || 0,
        totalHT,
        totalTTC: itemTotalTTC,
      }
    })

    const discountAmount = subtotalHT * (discountPercent / 100)
    const afterDiscount = subtotalHT - discountAmount
    const totalTTC = afterDiscount + totalVAT + 1 // +1 for timbre fiscal

    // Generate order number
    const count = await prisma.pOSOrder.count({ where: { tenantId } })
    const orderNumber = `POS-${Date.now()}-${String(count + 1).padStart(4, '0')}`

    const order = await prisma.pOSOrder.create({
      data: {
        tenantId,
        sessionId,
        orderNumber,
        clientId: clientId || null,
        clientName: clientName || 'Client rapide',
        subtotalHT,
        totalVAT,
        timbreFiscal: 1,
        totalTTC,
        paidAmount: paidAmount || totalTTC,
        changeGiven: paidAmount ? paidAmount - totalTTC : 0,
        paymentMethod,
        isPaid: paidAmount ? paidAmount >= totalTTC : false,
        discountPercent,
        discountAmount,
        notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    })

    // If payment made, record it
    if (paidAmount && paidAmount > 0) {
      await prisma.pOSPayment.create({
        data: {
          tenantId,
          orderId: order.id,
          method: paymentMethod,
          amount: paidAmount,
        },
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    console.error('POS order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}