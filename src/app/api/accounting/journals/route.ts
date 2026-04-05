import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
    }

    const journals = await prisma.accountingJournal.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' }
    })

    return NextResponse.json(journals)
  } catch (error) {
    console.error('Error fetching journals:', error)
    return NextResponse.json({ error: 'Failed to fetch journals' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, code, name, type } = await req.json()

    if (!tenantId || !code || !name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newJournal = await prisma.accountingJournal.create({
      data: {
        code,
        name,
        type,
        tenant: {
          connect: { id: tenantId }
        }
      }
    })

    return NextResponse.json(newJournal, { status: 201 })
  } catch (error) {
    console.error('Error creating journal:', error)
    return NextResponse.json({ error: 'Failed to create journal' }, { status: 500 })
  }
}
