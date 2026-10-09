import { requireTenant } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { tenantRefsError } from '@/lib/tenant-scope'
import { applyMovementTx, getDefaultWarehouseId } from '@/services/stock'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ctx = await requireTenant(request, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

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
      tenantId: requestedTenantId, 
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
    const ctx = await requireTenant(request, requestedTenantId)
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    if (!tenantId || !clientId || !number || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const badRef = await tenantRefsError(tenantId, {
      client: clientId,
      product: items.map((i: { productId?: string }) => i.productId),
    })
    if (badRef) return badRef

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
            module: { name: { equals: 'stock', mode: 'insensitive' } },
            isEnabled: true
          }
        })

        if (stockModule) {
          // Sortie de stock via le service (mouvement = source de vérité, dépôt par défaut).
          // Une vente n'est pas bloquée par un stock insuffisant (allowNegative) : voir alertes stock.
          const defaultWarehouseId = await getDefaultWarehouseId(tenantId, tx)
          for (const item of items) {
            if (!item.productId || !(Number(item.quantity) > 0)) continue
            await applyMovementTx(tx, {
              tenantId,
              productId: item.productId,
              warehouseId: defaultWarehouseId,
              type: 'EXIT',
              quantity: Number(item.quantity),
              reference: number,
              reason: 'SALE',
              notes: `${type === 'DELIVERY_NOTE' ? 'Livraison' : 'Vente'}: Doc ${number}`,
              sourceType: 'SALE',
              sourceId: invoice.id,
              createdById: ctx.user.id,
              allowNegative: true,
            })
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
