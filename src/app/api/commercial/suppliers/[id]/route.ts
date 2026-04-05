import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, address, city, matriculeFiscal } = body

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        city,
        matriculeFiscal,
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.supplier.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
