import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const clients = await prisma.client.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, code, name, email, phone, address, city, zipCode, matriculeFiscal } = body

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await prisma.client.create({
      data: {
        tenantId,
        code: code || `CLT-${Date.now()}`,
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
    console.error('Error creating client:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
