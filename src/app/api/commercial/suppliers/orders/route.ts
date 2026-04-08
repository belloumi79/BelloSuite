import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/suppliers/orders?tenantId=&status=
// POST /api/commercial/suppliers/orders - Create purchase order
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')

    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const where: any = { tenantId }
    if (status && status !== 'TOUT') where.status = status

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { client: true, supplier: true, items: true },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tenantId, supplierId, number, type = 'ORDER', date, expectedDate, items,
      subtotal, taxAmount, total, notes } = body

    if (!tenantId || !number || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const order = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: supplierId || null,
        number,
        type: type as any,
        status: 'PENDING',
        date: new Date(date || Date.now()),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal: subtotal || 0,
        taxAmount: taxAmount || 0,
        total: total || 0,
        notes,
        items: { create: items.map((item: any) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })) },
      },
      include: { supplier: true, items: true },
    })
    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}