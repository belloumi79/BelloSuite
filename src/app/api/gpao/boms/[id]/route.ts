import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const bom = await prisma.billOfMaterials.findUnique({
      where: { 
        id,
        tenantId,
      },
      include: {
        items: true
      }
    })

    if (!bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 })
    }

    return NextResponse.json(bom)
  } catch (error) {
    console.error('Error fetching BOM:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { tenantId, items, ...updateData } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    // Update the BOM and recreate the items
    const bom = await prisma.billOfMaterials.update({
      where: {
        id,
        tenantId,
      },
      data: {
        ...updateData,
        ...(items && {
          items: {
            deleteMany: {}, // Delete old items
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: Number(item.quantity)
            }))
          }
        })
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(bom)
  } catch (error) {
    console.error('Error updating BOM:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    await prisma.billOfMaterials.delete({
      where: {
        id,
        tenantId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting BOM:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
