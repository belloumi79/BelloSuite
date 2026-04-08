import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId },
      include: {
        movements: { include: { warehouse: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        warehouseStock: { include: { warehouse: true } },
      },
    })

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const body = await req.json()
    const {
      code, barcode, name, description, category,
      unit, purchasePrice, salePrice, vatRate, fodec,
      minStock, isActive, images, variants, supplierId,
    } = body

    // Check unique code if changed
    if (code) {
      const existing = await prisma.product.findFirst({
        where: { tenantId, code, NOT: { id: params.id } },
      })
      if (existing) return NextResponse.json({ error: 'Code produit déjà utilisé' }, { status: 409 })
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        code, barcode, name, description, category,
        unit, purchasePrice, salePrice, vatRate, fodec,
        minStock, isActive,
        images: images !== undefined ? images : undefined,
        variants: variants !== undefined ? variants : undefined,
        supplierId: supplierId !== undefined ? supplierId : null,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    await prisma.product.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
