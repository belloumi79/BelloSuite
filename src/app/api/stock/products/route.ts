import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: { tenantId },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, code, name, description, category, unit, purchasePrice, salePrice, minStock, initialStock } = body

    if (!tenantId || !code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        tenantId,
        code,
        name,
        description,
        category,
        unit: unit || 'unit',
        purchasePrice: purchasePrice || 0,
        salePrice: salePrice || 0,
        minStock: minStock || 0,
        currentStock: initialStock || 0,
      },
    })

    // If initial stock is provided, create an ENTRY movement
    if (initialStock > 0) {
      await prisma.stockMovement.create({
        data: {
          tenantId,
          productId: product.id,
          type: 'ENTRY',
          quantity: initialStock,
          unitPrice: purchasePrice || 0,
          notes: 'Stock initial',
        },
      })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
