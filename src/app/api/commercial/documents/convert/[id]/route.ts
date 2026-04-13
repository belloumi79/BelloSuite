import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/commercial/documents/convert/:id
// Body: { tenantId, targetType: 'INVOICE' | 'ORDER' | 'DELIVERY_NOTE' }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json()
    const { tenantId, targetType } = body
    if (!tenantId || !targetType) {
      return NextResponse.json({ error: 'tenantId and targetType required' }, { status: 400 })
    }

    const source = await prisma.invoice.findFirst({
      where: { id: (await params).id, tenantId },
      include: { items: true, client: true },
    })
    if (!source) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const typeMap: Record<string, string> = { QUOTE: 'ORDER', ORDER: 'INVOICE' }
    const actualTarget = typeMap[source.type] || targetType
    const prefix = actualTarget === 'ORDER' ? 'BC' : actualTarget === 'INVOICE' ? 'FAC' : actualTarget
    const newNumber = `${prefix}-${source.client?.code || 'CL'}-${Date.now().toString(36).toUpperCase()}`

    const converted = await prisma.$transaction(async (tx) => {
      const newDoc = await tx.invoice.create({
        data: {
          tenantId,
          clientId: source.clientId,
          number: newNumber,
          type: actualTarget as any,
          status: 'PENDING',
          date: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400000),
          subtotalHT: source.subtotalHT,
          totalFodec: source.totalFodec,
          totalVAT: source.totalVAT,
          timbreFiscal: actualTarget === 'INVOICE' ? 1 : 0,
          totalTTC: actualTarget === 'INVOICE' ? Number(source.totalTTC) + 1 : source.totalTTC,
          vatSummary: source.vatSummary as any,
          notes: `Converti depuis ${source.type} ${source.number}`,
          convertedFromId: source.id,
          items: {
            create: source.items.map((item: any) => ({
              productId: item.productId, description: item.description,
              unit: item.unit, quantity: item.quantity, unitPriceHT: item.unitPriceHT,
              discount: item.discount, fodecApply: item.fodecApply, fodecAmount: item.fodecAmount,
              vatRate: item.vatRate, vatAmount: item.vatAmount,
              totalHT: item.totalHT, totalTTC: item.totalTTC,
            })),
          },
        },
        include: { items: true, client: true },
      })

      // Update source status
      await tx.invoice.update({
        where: { id: source.id },
        data: { status: source.type === 'QUOTE' ? 'CONFIRMED' : 'CONFIRMED' },
      })

      return newDoc
    })

    return NextResponse.json(converted, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
