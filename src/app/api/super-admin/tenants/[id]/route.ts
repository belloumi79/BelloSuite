import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } },
        modules: { include: { module: true } }
      }
    })
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(tenant)
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { isActive, name, email, phone, city, address } = body

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isActive, name, email, phone, city, address }
    })
    return NextResponse.json(tenant)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 })
  }
}
