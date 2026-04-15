import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const assets = await prisma.asset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { workOrders: true }
        }
      }
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenantId, code, name, description, category, location, purchaseDate, purchaseCost, warrantyEnd, status
    } = body

    if (!tenantId || !code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const asset = await prisma.asset.create({
      data: {
        tenantId,
        code,
        name,
        description,
        category,
        location,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost ? Number(purchaseCost) : null,
        warrantyEnd: warrantyEnd ? new Date(warrantyEnd) : null,
        status: status || 'ACTIVE',
      },
    })

    return NextResponse.json(asset)
  } catch (error: any) {
    console.error('Error creating asset:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Asset code already exists for this tenant' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
