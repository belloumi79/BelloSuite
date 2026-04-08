import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    let params = await prisma.paieParameters.findUnique({
      where: { tenantId },
    })

    if (!params) {
      params = await prisma.paieParameters.create({
        data: { tenantId },
      })
    }

    return NextResponse.json(params)
  } catch (error) {
    console.error('Error fetching paie parameters:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, ...updates } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const params = await prisma.paieParameters.upsert({
      where: { tenantId },
      update: updates,
      create: { tenantId, ...updates },
    })

    return NextResponse.json(params)
  } catch (error) {
    console.error('Error updating paie parameters:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}