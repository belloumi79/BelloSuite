import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const workstations = await prisma.workStation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { productionOrders: true }
        }
      }
    })

    return NextResponse.json(workstations)
  } catch (error) {
    console.error('Error fetching workstations:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenantId, code, name, description, location, capacity, isActive
    } = body

    if (!tenantId || !code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const workstation = await prisma.workStation.create({
      data: {
        tenantId,
        code,
        name,
        description,
        location,
        capacity: capacity ? Number(capacity) : 1,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(workstation)
  } catch (error: any) {
    console.error('Error creating workstation:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'WorkStation code already exists for this tenant' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
