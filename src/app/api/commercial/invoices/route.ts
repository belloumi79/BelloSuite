import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/invoices?tenantId=&status=
// POST /api/commercial/invoices - Create invoice
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const where: any = { tenantId }
    if (status && status !== 'TOUT') where.status = status
    if (type) where.type = type

    const docs = await prisma.invoice.findMany({
      where,
      include: { client: true, items: true, tenant: true },
      orderBy: { date: 'desc' },
    })

    // Single invoice fetch by id
    const id = searchParams.get('id')
    if (id) {
      const single = await prisma.invoice.findUnique({
        where: { id },
        include: { client: true, items: true, tenant: true },
      })
      return NextResponse.json(single || { error: 'Not found' }, { status: single ? 200 : 404 })
    }

    return NextResponse.json(docs)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tenantId, clientId, number, type = 'INVOICE', date, dueDate, items,
      subtotalHT, totalFodec, totalVAT, timbreFiscal, totalTTC, vatSummary, notes } = body

    if (!tenantId || !number || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const doc = await prisma.invoice.create({
      data: {
        tenantId, clientId: clientId || null, number,
        type: type as any, status: 'PENDING',
        date: new Date(date || Date.now()),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotalHT: subtotalHT || 0, totalFodec: totalFodec || 0,
        totalVAT: totalVAT || 0, timbreFiscal: timbreFiscal || 1,
        totalTTC: totalTTC || 0, vatSummary: vatSummary || {},
        notes,
        items: { create: items.map((item: any) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: Number(item.quantity),
          unitPriceHT: Number(item.unitPriceHT),
          discount: Number(item.discount) || 0,
          fodecApply: item.fodecApply || false,
          fodecAmount: Number(item.fodecAmount) || 0,
          vatRate: Number(item.vatRate) || 19,
          vatAmount: Number(item.vatAmount) || 0,
          totalHT: Number(item.totalHT) || 0,
          totalTTC: Number(item.totalTTC) || 0,
        })) },
      },
      include: { client: true, items: true },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}