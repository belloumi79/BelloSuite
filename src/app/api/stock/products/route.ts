import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const products = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
  } catch (err) {
    console.error('GET /api/stock/products error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, code, barcode, name, description, category, unit, purchasePrice, salePrice, vatRate, fodec, minStock, initialStock } = body

    if (!tenantId || !code || !name) {
      return NextResponse.json({ error: 'tenantId, code, name required' }, { status: 400 })
    }

    const existing = await prisma.product.findUnique({
      where: { tenantId_code: { tenantId, code } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Code produit déjà utilisé' }, { status: 409 })
    }

    const product = await prisma.product.create({
      data: {
        tenantId,
        code,
        barcode: barcode || null,
        name,
        description: description || null,
        category: category || null,
        unit: unit || 'piece',
        purchasePrice: purchasePrice || 0,
        salePrice: salePrice || 0,
        vatRate: vatRate ?? 19,
        fodec: fodec ?? false,
        minStock: minStock || 0,
        currentStock: initialStock || 0,
      },
    })

    if (initialStock && Number(initialStock) > 0) {
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

    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    console.error('POST /api/stock/products error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
