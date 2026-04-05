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

    const periods = await prisma.accountingPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' }
    })

    return NextResponse.json(periods)
  } catch (error) {
    console.error('Error fetching periods:', error)
    return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, name, startDate, endDate } = await req.json()

    if (!tenantId || !name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newPeriod = await prisma.accountingPeriod.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        tenant: {
          connect: { id: tenantId }
        }
      }
    })

    return NextResponse.json(newPeriod, { status: 201 })
  } catch (error) {
    console.error('Error creating period:', error)
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 })
  }
}
