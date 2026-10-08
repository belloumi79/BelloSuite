import { requireTenant } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const id = (await params).id
    const body = await request.json()
    const { name, email, phone, address, city, zipCode, matriculeFiscal } = body

    const client = await prisma.client.update({
      where: { id, tenantId: ctx.tenantId },
      data: {
        name,
        email,
        phone,
        address,
        city,
        zipCode,
        matriculeFiscal,
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const id = (await params).id
    await prisma.client.delete({ where: { id, tenantId: ctx.tenantId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
