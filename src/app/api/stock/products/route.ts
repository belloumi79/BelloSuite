import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const lowStock = searchParams.get('lowStock')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const where: any = { tenantId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category
    if (isActive === 'true') where.isActive = true
    if (isActive === 'false') where.isActive = false
    if (lowStock === 'true') {
      // Filter in JS: gt 0 and lt minStock (Prisma doesn't support cross-field comparison)
      // Fetch all then filter below
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        warehouseStock: { include: { warehouse: true } },
      },
      orderBy: { name: 'asc' },
    })

    if (lowStock === 'true') {
      products = products.filter(p => {
        const s = Number(p.currentStock)
        return s > 0 && s < Number(p.minStock)
      })
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tenantId, code, barcode, name, description, category,
      unit, purchasePrice, salePrice, vatRate, fodec,
      minStock, initialStock, images, variants, supplierId,
    } = body

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
        unit: unit || 'unit',
        purchasePrice: purchasePrice || 0,
        salePrice: salePrice || 0,
        vatRate: vatRate ?? 19,
        fodec: fodec ?? false,
        minStock: minStock || 0,
        currentStock: initialStock || 0,
        images: images || [],
        variants: variants || [],
        supplierId: supplierId || null,
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
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
