import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      include: {
        client: true,
        items: true,
        tenant: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      tenantId, 
      clientId, 
      number, 
      date, 
      dueDate, 
      items, 
      subtotalHT, 
      totalFodec, 
      totalVAT, 
      timbreFiscal, 
      totalTTC, 
      vatSummary,
      notes,
      type
    } = body

    if (!tenantId || !clientId || !number || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use a transaction to ensure all operations succeed or none do
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          clientId,
          number,
          type: type || 'INVOICE',
          status: 'PENDING',
          date: new Date(date),
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotalHT,
          totalFodec,
          totalVAT,
          timbreFiscal,
          totalTTC,
          vatSummary: vatSummary || {},
          notes,
          items: {
            create: items.map((item: any) => ({
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
            })),
          },
        },
        include: {
          items: true,
        },
      })

      // Check if stock module is active and only decrement on INVOICE or DELIVERY_NOTE
      const shouldDecrementStock = (type === 'INVOICE' || type === 'DELIVERY_NOTE');

      if (shouldDecrementStock) {
        const stockModule = await tx.tenantModule.findFirst({
          where: {
            tenantId,
            module: { name: 'Stock' },
            isEnabled: true
          }
        })

        if (stockModule) {
          // Update Stock for each item that has a productId
          for (const item of items) {
          if (item.productId) {
            // 1. Update Product quantity
            await tx.product.update({
              where: { id: item.productId },
              data: {
                currentStock: {
                  decrement: Number(item.quantity),
                },
              },
            })

            // 2. Create Stock Movement
            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: item.productId,
                type: 'EXIT',
                quantity: Number(item.quantity),
                notes: `${type === 'DELIVERY_NOTE' ? 'Livraison' : 'Vente'}: Doc ${number}`,
                reference: number,
              },
            })
          }
        }
      }
      }

      return invoice
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
