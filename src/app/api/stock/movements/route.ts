import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, productId, type, quantity, unitPrice, reference, notes } = body

    if (!tenantId || !productId || !type || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use a transaction to ensure both movement is recorded and product stock updated
    const movement = await prisma.$transaction(async (tx) => {
      // 1. Create movement
      const mv = await tx.stockMovement.create({
        data: {
          tenantId,
          productId,
          type,
          quantity,
          unitPrice: unitPrice || 0,
          reference,
          notes,
        },
      })

      // 2. Update stock level
      const q = Number(quantity)
      let adjustment = q
      if (type === 'EXIT') adjustment = -q
      
      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: {
            increment: adjustment
          }
        }
      })

      return mv
    })

    return NextResponse.json(movement)
  } catch (error) {
    console.error('Error creating movement:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
